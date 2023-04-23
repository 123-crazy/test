// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * JS Service defined to handle Show Report related method execution only.
 *
 * @module js/showReport2Service
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import awChartDataProviderService from 'js/awChartDataProviderService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import reportsCommSrvc from 'js/reportsCommonService';
import confgItemRepSrvc from 'js/configureItemReportService';
import localeService from 'js/localeService';
import uwPropSvc from 'js/uwPropertyService';
import showReportSvc from 'js/showReportService';

var exports = {};

var _runtimeFilterApplied = false;
var _reportexistingFil = {};
var arrayOfSeriesDataForChart = [];
var keyValueDataForChart = [];
var localTextBundle = null;

export let updateRevisionRuleLabel = ( appliedRevRule ) => {
    var searchCriteriaStr  = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria' );
    if( searchCriteriaStr && searchCriteriaStr.includes( 'searchMethod\":\"BOM' ) ) {
        var searchCriteriaJSON = JSON.parse( searchCriteriaStr );
        var relationsPath = _.find( searchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        var revRule = relationsPath.revisionRule ? relationsPath.revisionRule : '';
        uwPropSvc.setValue( appliedRevRule, revRule );
    }
};

/**
 *
 * @function updateTotalFound
 * @param {any} data -
 */
export let updateTotalFound = function( data ) {
    var totFnd = appCtxService.ctx.ReportsContext.reportParameters.totalFound;
    var strTotalFnd = data.totalFoundString.propertyDisplayName + totFnd;
    var foundElement = document.getElementById( 'totalFoundLabel' );
    foundElement.innerText = strTotalFnd;
    foundElement.style.fontSize = 'medium';
};

/**
 * updateTimeOfRequest
 *
 * @function updateTimeOfRequest
 */
export let updateTimeOfRequest = function( data ) {
    var datetime = data.i18n.dashboardLastRefresh + ': ' + reportsCommSrvc.getReportUpdateTime( data );
    var foundElement = document.getElementById( 'timeOfRequestLabel' );
    foundElement.innerText = datetime;
    foundElement.style.fontSize = 'small';
};

/**
 * getNumCharts
 *
 * @function getNumCharts
 * @param {Object} charts charts config objects
 * @return {int} number of chosen charts
 */
export let getNumCharts = function( charts ) {
    var numCharts = 0;
    if ( charts.chart1Visible ) { numCharts++; }
    if ( charts.chart2Visible ) { numCharts++; }
    if ( charts.chart3Visible ) { numCharts++; }
    return numCharts;
};

var setupLayoutPanelForItemReport = function( repParameters ) {
    if ( repParameters.RuntimeInformation && repParameters.RuntimeInformation.searchFilterChartProps === undefined ) {
        //special case for Item Report edit, where Chart properties are not populated.
        //It requires search to complete 1st. So, we are using this entry point to ensure its populated.
        eventBus.publish( 'rb0ShowReport.populateItemRepFilterProps' );
    }
};

/**
 *
 * @function showPreviewClicked
 * @param {Object} data data variable from config panel scope
 * @return {Object} containing configuration for show preview panel
 */
export let showPreviewClicked = function( data ) {
    // showPreviewClicked aknowledgement
    var previewShown = appCtxService.ctx.ReportsContext.showPreview;

    // Handle Condition for when nothing is updated:
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    // var repParameters = appCtxService.getCtx( 'ReportParameters' );
    setupLayoutPanelForItemReport( repParameters );
    var updateTable = false;
    // Checks if there are items to update
    if ( previewShown && repParameters !== undefined && repParameters.UpdatedLayoutElement !== undefined &&
        ( repParameters.UpdatedLayoutElement.ElementToUpdate.length > 0 || repParameters.UpdatedLayoutElement.ElementToRemove.length > 0 ) ) {
        var updateElem = repParameters.UpdatedLayoutElement;
        var output = {};

        var charts = repParameters.ChartVisibility;
        // Check to see if there are no elements to update

        _.forEach( updateElem.ElementToUpdate, function( element ) {
            if ( element === 'ReportChart1' ) {
                eventBus.publish( 'updateChartGen1' );
            }

            if ( element === 'ReportChart2' ) {
                eventBus.publish( 'updateChartGen2' );
            }

            if ( element === 'ReportChart3' ) {
                eventBus.publish( 'updateChartGen3' );
            }

            if ( element === 'ReportTitle' ) {
                exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
            }

            if ( element === 'ReportTable1' ) {
                // eventBus.publish( 'updateTableProvider' );
                updateTable = true;
            }
        } );

        _.forEach( updateElem.ElementToRemove, function( element ) {
            if ( element === 'ReportChart1' ) {
                eventBus.publish( 'chartRemovedGen1' );
            }
            if ( element === 'ReportChart2' ) {
                eventBus.publish( 'chartRemovedGen2' );
            }
            if ( element === 'ReportChart3' ) {
                eventBus.publish( 'chartRemovedGen3' );
            }
            if ( element === 'ReportTitle' ) {
                exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
            }
            if ( element === 'ReportTable1' ) {
                eventBus.publish( 'removeTable' );
            }
        } );

        // get number of charts to persist layout correctly
        var numCharts = exports.getNumCharts( charts );
        if ( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
        }

        var tableChosen = false;
        if ( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            tableChosen = true;
        }

        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: charts.chart1Visible,
            dataIsReadyChart2: charts.chart2Visible,
            dataIsReadyChart3: charts.chart3Visible,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen
        };
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    } else if ( !previewShown && repParameters.ReportDefProps !== undefined ) {
        var titleChosen = false;

        if ( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
            exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
        }

        // need check number of charts
        var chartVisibility = repParameters.ChartVisibility;
        // var numCharts = 2;
        numCharts = 0;

        if ( chartVisibility.chart1Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen1' );
            // call exports directly
        }
        if ( chartVisibility.chart2Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen2' );
        }
        if ( chartVisibility.chart3Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen3' );
        }

        tableChosen = false;
        if ( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            tableChosen = true;
            // eventBus.publish( 'gridView.plTable.reload' );
        }
        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: chartVisibility.chart1Visible,
            dataIsReadyChart2: chartVisibility.chart2Visible,
            dataIsReadyChart3: chartVisibility.chart3Visible,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen
        };
        appCtxService.updatePartialCtx( 'ReportsContext.showPreview', true );
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    }
    exports.updateTimeOfRequest( data );
    exports.updateTotalFound( data );
    return output;
};

export let clearReportsCtx = function() {
    appCtxService.unRegisterCtx( 'ReportsContext' );
};

export let getSourceObjectUid = function( ctx ) {
    if ( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' && ctx.ReportsContext.reportParameters.rootSampleObjectSelected ) {
        return ctx.ReportsContext.reportParameters.rootSampleObjectSelected.uid;
    } else if ( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' && ctx.state.params.referenceId !== null ) {
        return ctx.state.params.referenceId;
    } else if ( ctx.selected ) {
        var selected = reportsCommSrvc.getUnderlyingObject( ctx.selected );
        return selected.uid;
    }
};

export let getSourceObjectTraversalPath = function( ctx ) {
    if ( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' ) {
        return confgItemRepSrvc.getTraversalPath();
    } else if ( ctx.ReportsContext.reportParameters && ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    }
};

var updateFiltersAndInitiateReportDisplay = function( reportSearchInfo, filterVals, filter, data ) {
    appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
    appCtxService.updatePartialCtx( 'ReportsContext.filterApplied', true );
    var filterChip = {
        uiIconId: 'miscRemoveBreadcrumb', chipType: 'BUTTON',
        labelDisplayName: filter.displayName + ': ' + filterVals.name,
        labelInternalName: filterVals.categoryName
    };
    data.filterChips.push( filterChip );
    _runtimeFilterApplied = true;
    eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
};

var isActiveItemReport = function() {
    return appCtxService.ctx.ReportsContext.selected && appCtxService.ctx.ReportsContext.selected.props.rd_type.dbValues[0] === '1';
};

export let applyFilterAndInitiateReportUpdate = function( filterValue, filterProperty, data ) {
    var searchFiltCat = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo.searchFilterCategories' );
    var filterPropertyInternalName = null;
    if ( data.chartProviders ) {
        // Get the selected chart provider and from chart provider get the series internal name
        // if present and then it will be used to filter based on internal name
        var selChartProvider = _.find( data.chartProviders, {
            seriesPropName: filterProperty
        } );
        if ( selChartProvider && selChartProvider.seriesInternalName ) {
            filterPropertyInternalName = selChartProvider.seriesInternalName;
        }
    }

    if ( searchFiltCat && searchFiltCat.length !== 0 && !isActiveItemReport() ) {
        _.every( searchFiltCat, function( filter ) {
            // Compare if property display name is matching and if not then try to match the internal name
            if ( filter.displayName === filterProperty ||
                filterPropertyInternalName && filter.internalName === filterPropertyInternalName ) {
                _.every( filter.filterValues, function( filterVals ) {
                    if ( filterVals.name === filterValue ) {
                        var selectedFilter = {};
                        if ( filterVals.type === 'NumericFilter' ) {
                            selectedFilter = {
                                searchFilterType: 'NumericFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName, startNumericValue: filterVals.startNumericValue,
                                endNumericValue: filterVals.endNumericValue
                            };
                        } else {
                            selectedFilter = { searchFilterType: 'StringFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName };
                        }
                        var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
                        //check if report has existing filters
                        if ( !_runtimeFilterApplied && Object.keys( reportSearchInfo.activeFilterMap ).length !== 0 ) {
                            _reportexistingFil = JSON.parse( JSON.stringify( reportSearchInfo.activeFilterMap ) );
                            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation.ReportExistingFilters', _reportexistingFil );
                        }
                        var tempArray = [];
                        tempArray.push( selectedFilter );
                        if ( !reportSearchInfo.activeFilterMap.hasOwnProperty( filterVals.categoryName ) ) {
                            reportSearchInfo.activeFilterMap[filterVals.categoryName] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        } else if ( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( filterVals.categoryName ) ) {
                            delete reportSearchInfo.activeFilterMap[filterVals.categoryName];
                            reportSearchInfo.activeFilterMap[filterVals.categoryName] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        }
                        return false;
                    }
                    return true;
                } );
                return false;
            }
            return true;
        } );
    }
};

export let removeReportFilter = function( data, filterChips, chipToRemove ) {
    filterChips.splice( filterChips.indexOf( chipToRemove ), 1 );
    data.filterChips = filterChips;
    var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
    if ( reportSearchInfo.activeFilterMap.hasOwnProperty( chipToRemove.labelInternalName ) ) {
        delete reportSearchInfo.activeFilterMap[chipToRemove.labelInternalName];
        //check if there are any stored existing filters stored.
        if ( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( chipToRemove.labelInternalName ) ) {
            reportSearchInfo.activeFilterMap[chipToRemove.labelInternalName] = JSON.parse( JSON.stringify( _reportexistingFil[chipToRemove.labelInternalName] ) );
        }
        appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
    }
};

/**
 * initiateReportDisplay
 *
 * @function initiateReportDisplay
 * @param {Object} data data
 * @param {Object} ctx ctx
 * @returns {Object} containing boolean indicating we need to show instructions
 */
export let initiateReportDisplay = function( data, ctx, subPanelContext, eventData ) {
    //This is a scenario when ReportViewer needs to be updated with new ReportDefinition.
    //In case of Active item report, Reports tab page initiates a event which is a ReportDef object.
    if(eventData && eventData.type && eventData.type === 'ReportDefinition') {
        subPanelContext = eventData;
    }
    appCtxService.updatePartialCtx( 'ReportsContext.showPreview', false );
    appCtxService.updatePartialCtx( 'ReportsContext.saveReportConfigActionComplete', false );
    let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
    var params = ctx.state.params;
    var title = params.title;
    if ( params.configure === 'true' ) {
        data.instructions = true;
    }
    if ( ctx.selected && ctx.selected.type === 'ReportDefinition' ) {
        appCtxService.updatePartialCtx( 'ReportsContext.selected', ctx.selected );
        var initRepDisplay = exports.rebuildReportDefProps( ctx.selected );
        if ( initRepDisplay ) {
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
            appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        } else {
            eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
        }
    } else if ( ctx.selected === null ) {
        document.getElementsByTagName( 'aw-sublocation-title' )[0].style.display = 'none';
        appCtxService.updateCtx( 'location.titles', { browserSubTitle: title, headerTitle: title } );
        //get ReportDefinition Object and update it in reports ctx
        showReportSvc.updateSelectedReport( data, params );
    } else if ( subPanelContext && subPanelContext.type === 'ReportDefinition' ) {
        appCtxService.updatePartialCtx( 'ReportsContext.selected', subPanelContext );
        initRepDisplay = exports.rebuildReportDefProps( subPanelContext );
        if ( initRepDisplay ) {
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    }
};

/**
 * Finds category based on property name comparison.
 * @param {*} targetCategories - categories of target Objects.
 * @param {*} sourceFilterPropName  - filter prop selected/defined.
 * @returns {*} target category matching to the source property.
 */
var getFilterCategoryFromPropertyName = function(targetCategories, sourceFilterPropName){
    const sourcePropName = sourceFilterPropName.substr(sourceFilterPropName.indexOf('.')+1); // ItemRevision.owning_user - it removes type name and returns owning_user.
    var returnCategory = undefined;
    _.forEach( targetCategories, function( category ) {
        const propNameInCategory = category.internalName.substr(category.internalName.indexOf('.')+1);// Part Revision.owning_user - it will remove type so that property name will be checked.
        if ( propNameInCategory === sourcePropName ) {
            returnCategory = category;
            return false;//it will break
        }
    } );
    return returnCategory;
};

/**
 * createChartFromArrayOfSeriesInternal
 *
 * @function createChartFromArrayOfSeriesInternal
 * @param {ObjectArray} searchResultFilters searchResultFilters
 * @param {ObjectArray} filterCategories filterCategories
 * @param {Object} filterMap filterMap
 * @param {Object} reportConfig reportConfig
 * @returns {ObjectArray} array series for entire chart
 */
export let createChartFromArrayOfSeriesInternal = function( searchResultFilters, filterCategories, filterMap, reportConfig ) {
    arrayOfSeriesDataForChart = [];
    keyValueDataForChart = [];
    var internalNameData;
    var searchFilterColumns3 = [];

    // Programatic generation of series
    var searchFilterName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[0] : reportConfig.ChartPropInternalName;
    keyValueDataForChart = [];
    _.forEach( filterCategories, function( category ) {
        // extract internal data for appropriate category to use later
        if ( category.internalName === searchFilterName ) {
            internalNameData = category;
        }
    } );

    //This is required in a scenario where chartProp is defined on ItemRevision but during execution 
    //filterCategories are built on PartRevision...... Source->BOMLines
    if(internalNameData === undefined && searchFilterName !== undefined && filterCategories.length > 0){
        internalNameData = getFilterCategoryFromPropertyName(filterCategories, searchFilterName);
    }

    if ( internalNameData === undefined || filterMap === undefined ) {
        return arrayOfSeriesDataForChart;
    }

    //Merge filters that have multiple keys (typically date filters)
    var groupedFilters = awChartDataProviderService.groupByCategory( filterMap );

    //Create a column for each filter option in that category
    var searchFilterColumns1 = groupedFilters[internalNameData.internalName];

    searchFilterColumns3 = [];
    // if no searchResultFilters no need to filter out results
    var count = 1;

    if ( searchResultFilters !== undefined && searchResultFilters.length !== 0 ) {
        // need to check filter matched column category
        _.every( searchResultFilters, function( searchFilter ) {
            var columnFound = false;
            if ( searchFilter.searchResultCategoryInternalName === internalNameData.internalName ) {
                _.forEach( searchFilterColumns1, function( column ) {
                    // filtering from selected columns when filter should apply to category
                    if ( column.selected ) {
                        searchFilterColumns3.push( column );
                        columnFound = true;
                    }
                } );

                //check if columns found, if true- don't need to process other filters break the loop.
                if ( columnFound ) {
                    //returning false to break
                    return false;
                }
                return true;
            } else if ( count === searchResultFilters.length ) {
                // condition to add those that do not need to be filtered out
                // if there are no filters left but there is data still, we need to add it to graph
                _.forEach( searchFilterColumns1, function( column ) {
                    searchFilterColumns3.push( column );
                } );
                return false; // so that every() will break
            }
            count++;
            return true;
        } );
    } else {
        // if nothing has to be filtered out:
        searchFilterColumns3 = searchFilterColumns1;
    }
    var dataPointsChart = searchFilterColumns3;

    //Remove non string filter values
    //The "merged" date filters will be string filters
    if ( internalNameData.type === 'DateFilter' ) {
        var searchFilterColumns2 = searchFilterColumns1.filter( function( option ) {
            return option.searchFilterType === 'StringFilter';
        } );
        searchFilterColumns3 = [];
        _.forEach( internalNameData.filterValues, function( searchFilter ) {
            _.forEach( searchFilterColumns2, function( option ) {
                if ( option.stringValue === searchFilter.internalName ) {
                    searchFilterColumns3.push( option );
                }
            } );
        } );
        dataPointsChart = searchFilterColumns3;
        // case for numeric filter
    } else if ( internalNameData.type === 'NumericFilter' ) {
        var isRangeFilter = false;
        searchFilterColumns3 = searchFilterColumns1.filter( function( option ) {
            if ( option.startEndRange === 'NumericRange' ) {
                isRangeFilter = true;
            }
            return option.startEndRange !== 'NumericRange';
        } );
        if ( isRangeFilter ) {
            dataPointsChart = searchFilterColumns3;
        }
    }
    //  should handle NONE values still
    exports.processUnassignedColumnsForChart( dataPointsChart );
    //Build a column for each of the remaining filters
    dataPointsChart = exports.processFinalColumnsForChart( dataPointsChart );

    //This is additional processing in case of Date filter..
    //We need to keep only leaf level columns which are not selected. Like Keep only Month if YEAR is also available.
    //One more additional step required when leaf level Day value filter is applied.
    //Only selected Day value should be shown on chart.
    var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
    var dayFilterApplied = false;
    if ( reportSearchInfo && reportSearchInfo.activeFilterMap.hasOwnProperty( searchFilterName + '_0Z0_year_month_day' ) ) {
        dayFilterApplied = true;
    }
    if ( internalNameData.type === 'DateFilter' ) {
        dataPointsChart = dataPointsChart.filter( function( dataPoint ) {
            if ( dayFilterApplied && dataPoint.internalExtension === '_0Z0_year_month_day' ) {
                return dataPoint.selected;
            }
            return !dataPoint.selected;
        } );
    }

    // for every data point create a label and value
    for ( var i = 0; i < dataPointsChart.length; i++ ) {
        keyValueDataForChart.push( {
            label: dataPointsChart[i].stringDisplayValue,
            name: dataPointsChart[i].stringDisplayValue,
            value: dataPointsChart[i].count
        } );
    }
    // push series of datapoints to entire chart series array
    arrayOfSeriesDataForChart.push( {
        seriesName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[0] : reportConfig.ChartPropName,
        keyValueDataForChart: keyValueDataForChart
    } );
    return arrayOfSeriesDataForChart;
};

/**
 * processUnassignedColumnsForChart
 *
 * @function processUnassignedColumnsForChart
 * @param {ObjectArray} dataPointsChart dataPointsChart
 */
export let processUnassignedColumnsForChart = function( dataPointsChart ) {
    _.forEach( dataPointsChart, function( option ) {
        if ( option.stringValue === '$NONE' && option.stringDisplayValue === '' ) {
            option.stringDisplayValue = localTextBundle.noFilterValue;
        }
    } );
};

/**
 * processFinalColumnsForChart
 *
 * @function processFinalColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 * @returns {ObjectArray} processed final columns
 */
export let processFinalColumnsForChart = function( searchFilterColumns5 ) {
    return searchFilterColumns5.map( function( option ) {
        //Add an extension to date filters
        option.internalExtension = awChartDataProviderService.getFilterExtension( option );
        //Give a label and value
        option.value = option.count;
        option.label = option.stringDisplayValue;
        //Append a checkmark if the filter is active
        if ( option.selected ) {
            option.label = '\u2713 ' + option.label;
        }
        return option;
    } );
};

/**
 * rd_params:
 [
    0: "ReportTitle"
    1: "ReportFilter_0"
    2: "ReportFilterValue_0"
    3: "ReportFilter_1"
    4: "ReportFilterLargeValue_1_0"
    5: "ReportFilterLargeValue_1_1"
    6: "ReportFilterLargeValue_1_2"
    7: "ReportFilterLargeValue_1_3"
    8: "ReportSearchCriteria"
]
 * rd_param_values:
 [
    0: "{"TitleText":"Numeric filters...","TitleColor":"#000000","TitleDispColor":"","TitleFont":"Segoe UI","TitleDispFont":""}"
    1: "WorkspaceObject.object_type"
    2: "[{"searchFilterType":"StringFilter","stringValue":"AW2_Prop_SupportRevision"}]"
    3: "AW2_Prop_SupportRevision.aw2_Double"
    4: "{"searchFilterType":"NumericFilter","stringValue":"1.0E-4","startNumericValue":0.0001,"endNumericValue":0.0001}"
    5: "{"searchFilterType":"NumericFilter","stringValue":"0.007","startNumericValue":0.007,"endNumericValue":0.007}"
    6: "{"searchFilterType":"NumericFilter","stringValue":"0.2","startNumericValue":0.2,"endNumericValue":0.2}"
    7: "{"searchFilterType":"NumericFilter","stringValue":"0.37","startNumericValue":0.37,"endNumericValue":0.37}"
    8: "Search*"
]
 *
 *
 *
 * @param  {any} selectedReportDef - the report object
 */
export let rebuildReportDefProps = function( selectedReportDef ) {
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var searchTraslatedCriteria = [];
    var initRepDisplay = true;
    var ReportDefProps = {};
    var ReportSearchInfo = { activeFilterMap: {} };
    var ReportTable1 = {};
    var ChartVisibility = { chart1Visible: false, chart2Visible: false, chart3Visible: false };
    for ( var index = 0; index < rd_params.length; index++ ) {
        if ( rd_params[index] === 'ReportTitle' ) {
            ReportDefProps[rd_params[index]] = JSON.parse( rd_paramValues[index] );
        } else if ( rd_params[index].startsWith( 'ReportFilter' ) ) {
            var filtrSplit = rd_params[index].split( '_' );
            if ( filtrSplit[0] === 'ReportFilter' ) {
                //ReportSearchInfo.activeFilterMap.push( rd_paramValues[ index ] );
            } else if ( filtrSplit[0] === 'ReportFilterLargeValue' ) {
                // If multiple filter values they are stored as ReportFilterLargeValue_1_1
                //filterName key will be always at constant location in
                var filtIndex = index - 1 - parseInt( filtrSplit[2] );
                var filtKey = rd_paramValues[filtIndex];
                var value = [];
                if ( ReportSearchInfo.activeFilterMap.hasOwnProperty( filtKey ) ) {
                    value = ReportSearchInfo.activeFilterMap[filtKey];
                    value.push( JSON.parse( rd_paramValues[index] ) );
                    ReportSearchInfo.activeFilterMap[filtKey] = value;
                } else {
                    value.push( JSON.parse( rd_paramValues[index] ) );
                    ReportSearchInfo.activeFilterMap[filtKey] = value;
                }
            } else if ( filtrSplit[0] === 'ReportFilterValue' ) {
                ReportSearchInfo.activeFilterMap[rd_paramValues[index - 1]] = JSON.parse( rd_paramValues[index] );
            }
        } else if ( rd_params[index] === 'ReportSearchCriteria' ) {
            ReportSearchInfo.SearchCriteria = rd_paramValues[index];
        } else if ( rd_params[index] === 'DataProvider' ) {
            ReportSearchInfo.dataProviderName = rd_paramValues[index];
        } else if ( rd_params[index] === 'AdditionalSearchCriteria' ) {
            ReportSearchInfo.additionalSearchCriteria = JSON.parse( rd_paramValues[index] );
        } else if ( rd_params[index].startsWith( 'ReportTable1' ) ) {
            if ( rd_params[index] === 'ReportTable1ColumnPropName' ) {
                ReportTable1.ColumnPropName = JSON.parse( rd_paramValues[index] );
            } else if ( rd_params[index].startsWith( 'ReportTable1ColumnPropInternalName_0' ) ) {
                var strClProps = [];
                strClProps = JSON.parse( rd_paramValues[index] );
                strClProps.push.apply( strClProps, JSON.parse( rd_paramValues[index + 1] ) );
                ReportTable1.ColumnPropInternalName = strClProps;
            }
        } else if ( rd_params[index] === 'ReportChart1_0' ) {
            var ReportChart1 = JSON.parse( rd_paramValues[index] );
            ReportChart1.ChartPropInternalName = JSON.parse( rd_paramValues[index + 1] );
            ChartVisibility.chart1Visible = true;
            ReportChart1.ChartPropInternalName = Array.isArray( ReportChart1.ChartPropInternalName ) ? ReportChart1.ChartPropInternalName[0] : ReportChart1.ChartPropInternalName;
            ReportChart1.ChartPropName = Array.isArray( ReportChart1.ChartPropName ) ? ReportChart1.ChartPropName[0] : ReportChart1.ChartPropName;
            ReportDefProps.ReportChart1 = ReportChart1;
        } else if ( rd_params[index] === 'ReportChart2_0' ) {
            var ReportChart2 = JSON.parse( rd_paramValues[index] );
            ReportChart2.ChartPropInternalName = JSON.parse( rd_paramValues[index + 1] );
            ChartVisibility.chart2Visible = true;
            ReportChart2.ChartPropInternalName = Array.isArray( ReportChart2.ChartPropInternalName ) ? ReportChart2.ChartPropInternalName[0] : ReportChart2.ChartPropInternalName;
            ReportChart2.ChartPropName = Array.isArray( ReportChart2.ChartPropName ) ? ReportChart2.ChartPropName[0] : ReportChart2.ChartPropName;
            ReportDefProps.ReportChart2 = ReportChart2;
        } else if ( rd_params[index] === 'ReportChart3_0' ) {
            var ReportChart3 = JSON.parse( rd_paramValues[index] );
            ReportChart3.ChartPropInternalName = JSON.parse( rd_paramValues[index + 1] );
            ChartVisibility.chart3Visible = true;
            ReportChart3.ChartPropInternalName = Array.isArray( ReportChart3.ChartPropInternalName ) ? ReportChart3.ChartPropInternalName[0] : ReportChart3.ChartPropInternalName;
            ReportChart3.ChartPropName = Array.isArray( ReportChart3.ChartPropName ) ? ReportChart3.ChartPropName[0] : ReportChart3.ChartPropName;
            ReportDefProps.ReportChart3 = ReportChart3;
        } else if ( rd_params[index] === 'ThumbnailChart' ) {
            ReportDefProps.ThumbnailChart = {
                ChartName: rd_paramValues[index]
            };
        } else if ( rd_params[index] === 'ReportTranslatedSearchCriteria' ) {
            searchTraslatedCriteria.push( rd_paramValues[index] );
            //Report initiation should start, only when translated query is returned
            initRepDisplay = false;
        } else if ( rd_params[index] === 'ReportClassParameters' ) {
            ReportDefProps.ReportClassParameters = {};
            var clsParams = JSON.parse( rd_paramValues[index] );
            ReportDefProps.ReportClassParameters.rootClassUid = clsParams.rootClassUid;
            ReportDefProps.ReportClassParameters.rootSampleUid = clsParams.rootSampleUid;
        } else if ( rd_params[index].startsWith( 'ReportSegment' ) ) {
            if ( ReportDefProps.ReportSegmentParams ) {
                ReportDefProps.ReportSegmentParams.push( JSON.parse( rd_paramValues[index] ) );
            } else {
                ReportDefProps.ReportSegmentParams = [];
                ReportDefProps.ReportSegmentParams.push( JSON.parse( rd_paramValues[index] ) );
            }
        }
    }

    ReportDefProps.ReportSearchInfo = ReportSearchInfo;
    if ( ReportTable1.ColumnPropName !== undefined ) {
        ReportDefProps.ReportTable1 = ReportTable1;
    }
    var reportParams = {};
    reportParams.ReportDefProps = ReportDefProps;
    reportParams.ChartVisibility = ChartVisibility;
    if ( searchTraslatedCriteria.length > 0 ) {
        reportParams.searchTraslatedCriteria = searchTraslatedCriteria;
    }

    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
    appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', {} );
    return initRepDisplay;
};

/**
 * updateTitle
 *
 * @function updateTitle
 * @param {Object} titleProps with title configurations
 */
export let updateTitle = function( titleProps ) {
    var titleElement = document.getElementById( 'titleReport' );
    if ( titleProps ) {
        titleElement.innerText = titleProps.TitleText;
        titleElement.style.fontSize = 'x-large';
        titleElement.style.color = titleProps.TitleColor;
        titleElement.style.fontFamily = titleProps.TitleFont;
    } else {
        titleElement.innerText = '';
    }
};

var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};

loadConfiguration();

export default exports = {
    rebuildReportDefProps,
    updateRevisionRuleLabel,
    updateTotalFound,
    updateTimeOfRequest,
    getNumCharts,
    showPreviewClicked,
    clearReportsCtx,
    applyFilterAndInitiateReportUpdate,
    removeReportFilter,
    getSourceObjectUid,
    getSourceObjectTraversalPath,
    initiateReportDisplay,
    createChartFromArrayOfSeriesInternal,
    updateTitle,
    processFinalColumnsForChart,
    processUnassignedColumnsForChart
};

app.factory( 'showreport2service', () => exports );

