// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * JS Service defined to handle Show Report related method execution only.
 *
 * @module js/showReportService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import filtrPanelSrvc from 'js/filterPanelService';
import filterPanelUtils from 'js/filterPanelUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import commandPanelService from 'js/commandPanel.service';
import viewModelObjectService from 'js/viewModelObjectService';
import configReportSrvc from 'js/configureReportService';
import cmm from 'soa/kernel/clientMetaModel';
import moreRepSvc from 'js/showReport2Service';
import confgItemRepSrvc from 'js/configureItemReportService';

var exports = {};

/**
 * gets the translated search criteria from server with the current locale's display value of the property in case of property specific search
 * @function fetchAndUpdateTranslatedSearchCriteria
 */
export let fetchAndUpdateTranslatedSearchCriteria = function( ) {
    let translatedSearchCriteria = appCtxService.getCtx( 'ReportsContext.reportParameters.searchTraslatedCriteria' );
    soa_kernel_soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: {
            inputSettings: {
                getTranslatedSearchCriteriaForCurrentLocale: translatedSearchCriteria
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale
            && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale.length === 1 && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
            translatedSearchCriteria = result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
        }
        if( translatedSearchCriteria && translatedSearchCriteria.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
            let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
            appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = translatedSearchCriteria;
            appCtxService.ctx.searchCriteria = translatedSearchCriteria;
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    } );
};

/**
 *
 * @param  {any} params - the
 */
export let updateSelectedReport = function( data, params ) {
    var selectedReportDef = null;
    if( selectedReportDef === null ) {
        //not live in current session.. get it from SOA
        var policyId = soa_kernel_propertyPolicyService.register( {
            types: [ {
                name: 'ReportDefinition',
                properties: [ { name: 'rd_parameters' }, { name: 'rd_param_values' }, { name: 'owning_user' } ]
            } ]
        } );
        var soaInput = [];
        soaInput.push( {
            source: 'Active Workspace',
            reportDefinitionId: params.reportId
        } );
        soa_kernel_soaService.postUnchecked( 'Reports-2008-06-CrfReports', 'getReportDefinitions', {
            inputCriteria: soaInput
        } ).then(
            function( response ) {
                let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
                exports.showReportInstructions( data, params );

                soa_kernel_propertyPolicyService.unregister( policyId );
                selectedReportDef = response.reportdefinitions[ 0 ].reportdefinition;

                appCtxService.updatePartialCtx( 'ReportsContext.selected', selectedReportDef );
                var reportObj = response.ServiceData.modelObjects[ selectedReportDef.uid ];
                if( reportObj.props.rd_parameters.dbValues.length > 0 && selectedReportDef ) {
                    var initRepDisplay = true;
                    //this is a execution of saved report.fetch rd_param_values and rd_parameters from selected report def
                    //and setup the ReportDefProps in report ctx.use ReportObject from response.ServiceData.
                    initRepDisplay = moreRepSvc.rebuildReportDefProps( reportObj );

                    if( params.configure === 'false' && initRepDisplay ) {
                        confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
                        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
                        appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
                    } else if( params.configure === 'false' ) {
                        eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
                    }

                    if( params.configure === 'false' && params.referenceId !== null && reportObj.props.rd_type.dbValues[ 0 ] === '1' ) {
                        eventBus.publish( 'reportDashboard.getSourceObject' );
                    }
                }
                if( params.configure === 'true' ) {
                    var commandId = 'Rb0ConfigureReport';
                    commandId = params.reportType === '4' ? 'Rb0ConfigureReport' : 'Rb0ConfigureItemReport';

                    var location = 'aw_toolsAndInfo';
                    //Shows Configure Report panel with search string.
                    commandPanelService.activateCommandPanel( commandId, location );
                }

                return selectedReportDef;
            } );
    }
};

/**
 * processFinalColumnsForChart
 *
 * @function filterUpdated
 * @param {int} totalObjsFound totalObjsFound
 * @returns {Object} containing boolean indicating whether a refresh on a table is needed
 */
export let filterUpdated = function( data ) {
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    var showPreview = appCtxService.getCtx( 'ReportsContext.showPreview' );
    var updateTable = false;
    // check to see if showpreview has been click
    // if it has not been clicked, we do not want to auto refresh charts
    if( showPreview ) {
        if( repParameters.ChartVisibility.chart1Visible ) {
            eventBus.publish( 'updateChartGen1' );
        }
        if( repParameters.ChartVisibility.chart2Visible ) {
            eventBus.publish( 'updateChartGen2' );
        }
        if( repParameters.ChartVisibility.chart3Visible ) {
            eventBus.publish( 'updateChartGen3' );
        }

        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            // conditions in order to properly destroy and recreate the table with new specifications
            //updateTable = true;
            //appCtxService.updatePartialCtx( 'updateTable', updateTable );
            eventBus.publish( 'gridView.plTable.reload' );
        }
        eventBus.publish( 'showReportService.updateTotalFoundOnCtx' );
        var output = {
            updateTable
        };
        moreRepSvc.updateTimeOfRequest( data );
        moreRepSvc.updateTotalFound( data );
        return output;
    }
};

var getNumericFilterValue = function( filter ) {
    if( filter.categoryType === 'NumericRangeFilter' ) {
        var range = filter.name.split( ' - ' );
        return {
            searchFilterType: 'NumericFilter',
            stringValue: '',
            selected: true,
            stringDisplayValue: '',
            startDateValue: '',
            endDateValue: '',
            startNumericValue: Number( range[ 0 ] ),
            endNumericValue: Number( range[ 1 ] ),
            count: filter.count,
            startEndRange: 'NumericRange'
        };
    }
    return {
        searchFilterType: 'NumericFilter',
        stringValue: filter.internalName,
        selected: true,
        stringDisplayValue: filter.name,
        startDateValue: '',
        endDateValue: '',
        startNumericValue: filter.startNumericValue,
        endNumericValue: filter.endNumericValue,
        count: filter.count,
        startEndRange: ''
    };
};

/**
 * getSearchFilterMap
 *
 * @function getSearchFilterMap
 * @param {Object} ctx ctx
 * @returns {Object} containing filters to be processed by table
 */
export let getSearchFilterMap = function( ctx ) {
    var output = {};
    // retrieve filters
    var filters = ctx.ReportsContext.searchIncontextInfo.searchResultFilters;
    if( filters && filters.length > 0 ) {
        var dateFilterToProcess = [];
        for( var y = 0; y < filters.length; y++ ) {
            var keyValueData = [];
            var filterCategory = null;
            // iterate on each filterValue per filter
            for( var x = 0; x < filters[ y ].filterValues.length; x++ ) {
                filterCategory = filters[ y ].filterValues[ x ].categoryName === undefined ? filters[ y ].searchResultCategoryInternalName : filters[ y ].filterValues[ x ].categoryName;
                if( filters[ y ].filterValues[ x ].type !== 'DateFilter' && filters[ y ].filterValues[ x ].type !== 'DrilldownDateFilter' ) {
                    if( filters[ y ].filterValues[ x ].type === 'NumericFilter' ) {
                        keyValueData.push( getNumericFilterValue( filters[ y ].filterValues[ x ] ) );
                    } else {
                        keyValueData.push( {
                            searchFilterType: 'StringFilter',
                            stringValue: filters[ y ].filterValues[ x ].internalName,
                            selected: true,
                            stringDisplayValue: filters[ y ].filterValues[ x ].name,
                            startDateValue: '',
                            endDateValue: '',
                            startNumericValue: 0,
                            endNumericValue: 0,
                            count: filters[ y ].filterValues[ x ].count,
                            startEndRange: ''
                        } );
                    }
                    output[ filterCategory ] = keyValueData;
                } else {
                    if( !dateFilterToProcess.includes( filters[ y ] ) ) {
                        dateFilterToProcess.push( filters[ y ] );
                    }
                }
            }
        }

        if( dateFilterToProcess.length > 0 ) {
            dateFilterToProcess.forEach( element => {
                element.filterValues.forEach( selectedFilter => {
                    var tempArray = [];
                    var filterType = 'DateFilter';
                    var startDateValue = '';
                    var endDateValue = '';
                    var filterCategory = selectedFilter.categoryName;
                    if( ( selectedFilter.type === 'DrilldownDateFilter' || selectedFilter.type === 'DateFilter' ) && selectedFilter.categoryName !== undefined && ( selectedFilter
                            .categoryName.endsWith( '0Z0_week' ) || selectedFilter.categoryName.endsWith( '0Z0_year_month_day' ) ||
                            selectedFilter.categoryName.endsWith( '0Z0_year' ) || selectedFilter.categoryName.endsWith( '0Z0_year_month' ) ) ) {
                        filterType = 'StringFilter';
                    } else if( selectedFilter.categoryType !== undefined && selectedFilter.categoryType === 'DateRangeFilter' ) {
                        var dateCat = ctx.ReportsContext.searchIncontextInfo.searchFilterCategories.filter( function( category ) {
                            return category.internalName === element.searchResultCategoryInternalName;
                        } );
                        var startValue = dateCat[ 0 ].daterange.startDate.dateApi.dateObject;
                        var endValue = dateCat[ 0 ].daterange.endDate.dateApi.dateObject;
                        var internalName = filterPanelUtils.getDateRangeString( startValue, endValue );
                        var dateRangeFilter = filterPanelUtils.getDateRangeFilter( internalName.substring( 12, internalName.length ) );
                        startDateValue = dateRangeFilter.startDateValue;
                        endDateValue = dateRangeFilter.endDateValue;
                        filterCategory = element.searchResultCategoryInternalName;
                    }

                    var filter = {
                        searchFilterType: filterType,
                        stringValue: selectedFilter.internalName,
                        selected: true,
                        stringDisplayValue: selectedFilter.name,
                        startDateValue: startDateValue,
                        endDateValue: endDateValue,
                        startNumericValue: 0,
                        endNumericValue: 0,
                        count: selectedFilter.count,
                        startEndRange: ''
                    };
                    tempArray.push( filter );

                    if( output.hasOwnProperty( filterCategory ) ) {
                        var existArray = output[ filterCategory ];
                        existArray.push( filter );
                        output[ filterCategory ] = existArray;
                    } else {
                        output[ filterCategory ] = tempArray;
                    }
                } );
            } );
        }
    }
    return output;
};

// Method to disable condition for chart visibility
export let chartRemoveGen1 = function() {
    return {
        dataIsReadyChartGen1: false
    };
};

// Method to disable condition for chart visibility
export let chartRemoveGen2 = function() {
    return {
        dataIsReadyChartGen2: false
    };
};

// Method to disable condition for chart visibility
export let chartRemoveGen3 = function() {
    return {
        dataIsReadyChartGen3: false
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen1 = function() {
    return {
        dataIsReadyChartGen1: true
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen2 = function() {
    return {
        dataIsReadyChartGen2: true
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen3 = function() {
    return {
        dataIsReadyChartGen3: true
    };
};

export let createChartFromArray1 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart1.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart1.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart1.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
        data.chartProviders.genericChart1.seriesPropName = Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName;

        // Add logic to set chart custom config from set layout
        var chartPoints = moreRepSvc.createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart1NoData = true;
            data.chartProviders.genericChart1.title = '';
        } else { data.chart1NoData = false; }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 1 for ' + reportConfig );
    }
};

export let createChartFromArray2 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart2.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart2.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart2.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
        data.chartProviders.genericChart2.seriesPropName = Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName;

        // Add logic to set chart custom config from set layout
        var chartPoints = moreRepSvc.createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart2NoData = true;
            data.chartProviders.genericChart2.title = '';
        } else { data.chart2NoData = false; }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 2 for ' + reportConfig );
    }
};

export let createChartFromArray3 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart3.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart3.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart3.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
        data.chartProviders.genericChart3.seriesPropName = Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName;

        // Add logic to set chart custom config from set layout
        var chartPoints = moreRepSvc.createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart3NoData = true;
            data.chartProviders.genericChart3.title = '';
        } else { data.chart3NoData = false; }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 3 for ' + reportConfig );
    }
};

export let _dateFilterMarker = '_0Z0_';

export let showReportInstructions = function( data, params ) {
    var reportName = params.title;
    var reportInstructions = params.reportType === '4' ? data.i18n.instructionsTitle : data.i18n.itemReportinstructions;
    var instrWidgId = params.reportType === '4' ? 'instructionswidget' : 'iteminstrutionswidget';
    reportInstructions = reportInstructions.replace( '{0}', reportName );
    var titleElement = document.getElementById( instrWidgId );
    titleElement.innerText = reportInstructions;
};

/**
 * Register the policy
 * @returns {any} policyId
 */
export let registerPolicy = function() {
    var reportDefs = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    var types = {};
    var typeList = [];
    if( reportDefs && reportDefs.ReportTable1 ) {
        var propList = reportDefs.ReportTable1.ColumnPropInternalName;
        for( var x = 0; x < propList.length; x++ ) {
            var propAndObj = propList[ x ].split( '.' );
            var typePropList = {};
            typePropList.name = propAndObj[ 0 ];
            var prop = {};
            prop.name = propAndObj[ 1 ];
            typePropList.properties = [ prop ];
            typeList.push( typePropList );
        }
        types.types = typeList;
        return soa_kernel_propertyPolicyService.register( types );
    }
};

export let getValidSortCriteriaField = function( sortCriteria, data ) {
    if( data.columns ) {
        var propName = sortCriteria.fieldName;
        var selColumn = data.columns.filter( function( column ) {
            return column.name === propName;
        } );
        return selColumn.length > 0 ? selColumn[ 0 ].typeName + '.' + propName : propName;
    }
};

/**
 *
 * Load Table
 * @param {any} data - Data
 * @param  {any} searchInput - The Search Input
 * @param  {any} columnConfigInput - The Column Config Input
 * @param  {any} saveColumnConfigData - Save Column Config Data
 *
 * @returns {any} response
 */
export let loadData = function( data, searchInput, columnConfigInput, saveColumnConfigData ) {
    //register property policy
    var policyId = exports.registerPolicy();

    if( searchInput.searchSortCriteria !== undefined && searchInput.searchSortCriteria.length > 0 && searchInput.cursor !== undefined && searchInput.cursor.startIndex === 0 ) {
        var fieldName = exports.getValidSortCriteriaField( searchInput.searchSortCriteria[ 0 ], data );
        searchInput.searchSortCriteria[ 0 ].fieldName = fieldName;
    }

    return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
        columnConfigInput: columnConfigInput,
        inflateProperties: false,
        noServiceData: false,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput
    } ).then(
        function( response ) {
            soa_kernel_propertyPolicyService.unregister( policyId );
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }

            // Create view model objects
            response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects
                .map( function( vmo ) {
                    return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                } ) : [];

            return response;
        } );
};

/**
 * loadColumns
 *
 * @function loadColumns
 * @param {Object} dataprovider dataprovider
 * @param {Object} reportTable reportTable
 */
 export let loadColumns = function( dataprovider, reportTable, colmnWidth ) {
    var corrected = [];
    var colWidth = colmnWidth === undefined ? 300 : colmnWidth;

    var typeN = reportTable.ColumnPropInternalName[ 0 ].split( '.' );
    var objectMeta = cmm.getType( typeN[ 0 ] );
    var displayName = reportTable.ColumnPropName[ 0 ];
    if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
        displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
    }
    var initialCol = {
        name: typeN[ 1 ],
        displayName: displayName,
        typeName: typeN[ 0 ],
        width: 250,
        pinnedLeft: true,
        enableColumnMenu: true
    };

    corrected.push( initialCol );

    for( var x = 1; x < reportTable.ColumnPropInternalName.length; x++ ) {
        typeN = reportTable.ColumnPropInternalName[ x ].split( '.' );
        objectMeta = cmm.getType( typeN[ 0 ] );
        displayName = reportTable.ColumnPropName[x ];
        if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
            displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
        }
        var obj = { name: typeN[ 1 ], displayName: displayName, typeName: typeN[ 0 ], width: colWidth };
        if( typeN[ 1 ] === 'release_status_list' || typeN[ 1 ] === 'release_statuses' ) {
            obj.enableSorting = false;
        }
        corrected.push( obj );
    }
    if( dataprovider !== null ) {
        dataprovider.columnConfig = {
            columns: corrected
        };
    }

    return corrected;
};

/**
 * removeDataTable
 *
 * @function removeDataTable
 * @return {Object} object with dataIsReadyTable boolean to trigger condition for removind the data table
 */
export let removeDataTable = function() {
    return { dataIsReadyTable: false };
};

/**
 * updateDataTable - set boolean to trigger condition for when table has already been updated
 *
 * @function updateDataTable
 */
export let updateDataTable = function() {
    var updateTable = appCtxService.getCtx( 'updateTable' );
    if( updateTable ) {
        appCtxService.updatePartialCtx( 'updateTable', false );
    }
};

export let callRepGetCategories = function( response ) {
    var categories = response.searchFilterCategories;
    var categoryValues = response.searchFilterMap6;
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    var searchResultFilters = [];
    categories.refineCategories = [];
    categories.navigateCategories = [];
    var contextObject = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    if( contextObject === undefined ) { contextObject = {}; }

    _.forEach( categories, function( category, index ) {
        filtrPanelSrvc.getCategories2Int( category, index, categories, categoryValues, groupByProperty, false, true, true, contextObject, searchResultFilters );
    } );

    contextObject.searchResultFilters = searchResultFilters;
    contextObject.searchFilterCategories = categories;

    appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', contextObject );

    return categories;
    //return searchCommonUtils.callGetCategories( response );
};

export let updateReportsCtxSearchInfo = function( response, data ) {
    callRepGetCategories( response );
    configReportSrvc.updateReportsCtxForFilters( data );
};

/**
 *
 * @function callRepGetProviderName
 * @param {Object} ctx - ctx
 * @return {Object} data provider name
 */
 export let callRepGetProviderName = function( ctx ) {
    if( ctx.ReportsContext.selected && ctx.ReportsContext.selected.props.rd_type.dbValues[0] === '1' ) {
        return 'Rb0ReportsDataProvider';
    }else if ( ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName;
    }
    return 'Awp0FullTextSearchProvider';
};

/**
 *
 * @function callRepGetSearchCriteria
 * @param {Object} ctx - ctx
 * @return {Object} additional search criteria to perform search
 */
 export let callRepGetSearchCriteria = function( ctx ) {
    var searchCriteria = {};

    if( ctx.ReportsContext.selected && ctx.ReportsContext.selected.props.rd_type.dbValues[0] === '1' ) {
        searchCriteria = {
            sourceObject: moreRepSvc.getSourceObjectUid( ctx ),
            relationsPath: moreRepSvc.getSourceObjectTraversalPath( ctx )
        };
    } else {
        searchCriteria = { searchString: ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria };
    }

    var reportSearchInfo = ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo;
    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportSearchInfo.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportSearchInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }
    return searchCriteria;
};

export default exports = {
    updateSelectedReport,
    filterUpdated,
    getSearchFilterMap,
    chartRemoveGen1,
    chartRemoveGen2,
    chartRemoveGen3,
    chartReadyGen1,
    chartReadyGen2,
    chartReadyGen3,
    createChartFromArray1,
    createChartFromArray2,
    createChartFromArray3,
    _dateFilterMarker,
    showReportInstructions,
    registerPolicy,
    getValidSortCriteriaField,
    loadData,
    loadColumns,
    removeDataTable,
    updateDataTable,
    callRepGetCategories,
    fetchAndUpdateTranslatedSearchCriteria,
    updateReportsCtxSearchInfo,
    callRepGetProviderName,
    callRepGetSearchCriteria
};
/**
 * Marker for date filters
 *
 * @member _dateFilterMarker
 * @memberOf NgServices.awChartDataProviderService
 */
app.factory( 'showreportservice', () => exports );
