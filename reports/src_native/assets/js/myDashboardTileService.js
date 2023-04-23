// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * JS Service defined to handle Add Report related method execution only.
 *
 * @module js/myDashboardTileService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import showReportSrvc from 'js/showReportService';
import graphQLSvc from 'js/graphQLService';
import logger from 'js/logger';
import viewModelObjectService from 'js/viewModelObjectService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import $ from 'jquery';
import dataProviderFactory from 'js/dataProviderFactory';
import declDataProviderService from 'js/declDataProviderService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import moreRepSvc from 'js/showReport2Service';

var exports = {};

/**
 * Get information related to search string, filters ,thumbnail chart,
 * data provider and search criterias.
 * @param  {any} selectedReportDef - the report object
 * @returns {any} reportTileInfo -
 */
var getReportSearchAndChartParametersForTile = function( selectedReportDef ) {
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var reportTileInfo = {
        activeFilterMap: {},
        tileElement: ''
    };
    var thumbnailChartFound = false;
    var thumbnailElement = null;
    var tileTable = {};
    var tileChart = {};
    for( var index = 0; index < rd_params.length; index++ ) {
        if( rd_params[ index ].startsWith( 'ReportFilter' ) ) {
            var filtrSplit = rd_params[ index ].split( '_' );
            if( filtrSplit[ 0 ] === 'ReportFilterLargeValue' ) {
                // If multiple filter values they are stored as ReportFilterLargeValue_1_1
                //filterName key will be always at constant location in
                var filtIndex = index - 1 - parseInt( filtrSplit[ 2 ] );
                var filtKey = rd_paramValues[ filtIndex ];
                var value = [];
                if( reportTileInfo.activeFilterMap.hasOwnProperty( filtKey ) ) {
                    value = reportTileInfo.activeFilterMap[ filtKey ];
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    reportTileInfo.activeFilterMap[ filtKey ] = value;
                } else {
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    reportTileInfo.activeFilterMap[ filtKey ] = value;
                }
            } else if( filtrSplit[ 0 ] === 'ReportFilterValue' ) {
                reportTileInfo.activeFilterMap[ rd_paramValues[ index - 1 ] ] = JSON.parse( rd_paramValues[ index ] );
            }
        } else if( rd_params[ index ] === 'DataProvider' ) {
            reportTileInfo.dataProviderName = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'AdditionalSearchCriteria' ) {
            reportTileInfo.additionalSearchCriteria = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ] === 'ReportSearchCriteria' ) {
            reportTileInfo.SearchCriteriaString = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'ThumbnailChart' ) {
            thumbnailChartFound = true;
            var selectThumbChart = rd_paramValues[ index ];
            if( selectThumbChart !== 'ReportTable1' ) {
                selectThumbChart += '_0';
                var thumbIndex = rd_params.indexOf( selectThumbChart );
                tileChart = JSON.parse( rd_paramValues[ thumbIndex ] );
                tileChart.ChartPropInternalName = JSON.parse( rd_paramValues[ thumbIndex + 1 ] );
                reportTileInfo.tileElement = 'Chart';
            }else{
                reportTileInfo.tileElement = 'Table';
            }
        } else if( rd_params[ index ].startsWith( 'ReportTable1' ) ) {
            if( rd_params[ index ] === 'ReportTable1ColumnPropName' ) {
                tileTable.ColumnPropName = JSON.parse( rd_paramValues[ index ] );
            } else if( rd_params[ index ].startsWith( 'ReportTable1ColumnPropInternalName_0' ) ) {
                var strClProps = [];
                strClProps = JSON.parse( rd_paramValues[ index ] );
                strClProps.push.apply( strClProps, JSON.parse( rd_paramValues[ index + 1 ] ) );
                tileTable.ColumnPropInternalName = strClProps;
            }
        }
    }
    if( !thumbnailChartFound && rd_params.length > 0 ) {
        thumbIndex = rd_params.indexOf( 'ReportChart1_0' );
        var ReportChart1 = JSON.parse( rd_paramValues[ thumbIndex ] );
        ReportChart1.ChartPropInternalName = JSON.parse( rd_paramValues[ thumbIndex + 1 ] );
        tileChart = ReportChart1;
        reportTileInfo.tileElement = 'Chart';
    }

    //set data provider name and construct search criteria
    setDataProviderName( selectedReportDef, reportTileInfo );
    constructSearchCriteria( selectedReportDef, reportTileInfo );

    if( reportTileInfo.tileElement === 'Table' ) {
        reportTileInfo.ChartConfiguration = tileTable;
    } else{
        reportTileInfo.ChartConfiguration = tileChart;
    }

    return reportTileInfo;
};

/**
 * Sets the Data provider name for reportTileInfo object to
 * be used as input for performSearch SOA call.
 * @param  {any} reportTileInfo - the report tile info object
 */
var setDataProviderName = function( selectedReportDef, reportTileInfo ) {
    if( !reportTileInfo.dataProviderName && selectedReportDef.props.rd_type.dbValues[0] !== '1' ) {
        reportTileInfo.dataProviderName = 'Awp0FullTextSearchProvider';
    } else if( selectedReportDef.props.rd_type.dbValues[0] === '1' ) {
        reportTileInfo.dataProviderName = 'Rb0ReportsDataProvider';
    }
};

/**
 * Constructs searchCriteria to be used as input for performSearch SOA call.
 * @param  {any} reportTileInfo - the report tile info object
 */
var constructSearchCriteria = function( selectedReportDef, reportTileInfo ) {
    if( selectedReportDef.props.rd_type.dbValues[ 0 ] === '4' && selectedReportDef.props.reportSearchRecipeExtraInfo &&
        selectedReportDef.props.reportSearchRecipeExtraInfo.dbValues.localeSearchString !== '' ) {
        reportTileInfo.SearchCriteriaString = selectedReportDef.props.reportSearchRecipeExtraInfo.dbValues.localeSearchString;
    }
    var searchCriteria = {
        searchString: reportTileInfo.SearchCriteriaString
    };

    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportTileInfo.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportTileInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }

    if( selectedReportDef.props.rd_type.dbValues[0] === '1' ) {
        searchCriteria.sourceObject = selectedReportDef.props.rd_sourceObject.dbValue;
        searchCriteria.relationsPath = reportTileInfo.SearchCriteriaString;
        delete searchCriteria.searchString;
    }
    reportTileInfo.searchCriteria = searchCriteria;
};

/**
 * Returns input for performSearchViewModel SOA call
 *
 * @param {*} searchAndChartInfo - subPanelContext
 * @returns {*} input for SOA performSearchViewModel
 */
var getPerformSearchSOAInput = function( searchAndChartInfo ) {
    return {
        searchInput: {
            attributesToInflate: [],
            internalPropertyName: '',
            maxToLoad: searchAndChartInfo.tileElement === 'Chart' ? 1 : 20,
            maxToReturn: searchAndChartInfo.tileElement === 'Chart' ? 0 : 20,
            providerName: searchAndChartInfo.dataProviderName,
            searchCriteria: searchAndChartInfo.searchCriteria,
            searchFilterFieldSortType: 'Priority',
            cursor: {
                startIndex: searchAndChartInfo.startIndex
            },
            searchFilterMap6: searchAndChartInfo.activeFilterMap,
            searchSortCriteria: searchAndChartInfo.searchSortCriteria
        },
        columnConfigInput: {
            clientName: '',
            clientScopeURI: ''
        }
    };
};

/**
 * Call to graphql query
 *
 /*"searchFilterContext": "<searchCommonParameters.UserSessionQuery>"
 "chartSearchCriteria": [{
 "chartID": <Unique Idenfier for this Report eg UID> : Useful in case of multiseries charts,
 "searchCriteria": {
         "searchQueryString": <base criteria>,
         "searchFilters": [
             <list of filters -- add RevRuleFitler here.>
         ]},
 "categoriesToChartOn": {
     "typeName": <Teamcenter Type>
     "propertyName": <Teamcenter Property>,
     "propertyType": <Property Type> -- optional
     "locale" : <current locale> : only in case of localized properties -- optional
     }
 }
 * @param {*} reportDefObject
 * @param {*} data
 */

var callChartInfoGql = function( reportDefObject, data, searchAndChartInfo ) {
    //Prepare Request for GraphQL API
    var searchCommonParameters = appCtxService.getCtx( 'ReportsContext.SearchParameters' );
    var userSession = appCtxService.getCtx( 'userSession' );
    var currentLocale = userSession.props.fnd0locale.dbValue;

    //1. searchCriteria and search filters
    let searchCriteria = {};
    searchCriteria.searchQueryString = reportDefObject.props.translatedBaseCriteria.dbValue;
    let searchFilters = [];
    if( reportDefObject.props.translatedFilterQueries && reportDefObject.props.translatedFilterQueries.dbValues.length > 0 ) {
        reportDefObject.props.translatedFilterQueries.dbValues.map( filterQuery => {
            searchFilters.push( filterQuery );
        } );
    }
    searchFilters.push( searchCommonParameters.RevRuleQuery );
    searchCriteria.searchFilters = searchFilters;

    //2. Categories to chart on
    let categoriesToChartOn = [];
    if( reportDefObject.props.reportChartObjects && reportDefObject.props.reportChartObjects.dbValues.length > 0 ) {
        reportDefObject.props.reportChartObjects.dbValues.map( reportChartObject => {
            let categoryToChartOn = {};
            categoryToChartOn.typeName = reportChartObject.chartTypeName;
            categoryToChartOn.propertyName = reportChartObject.chartPropertyName;
            categoryToChartOn.propertyType = reportChartObject.chartPropertyType === 'Date' ? 'DateType' : 'StringType';
            categoryToChartOn.locale = reportChartObject.isPropertyLocalized ? currentLocale : '';
            categoriesToChartOn.push( categoryToChartOn );
        } );
    }

    //3. Search filter context
    let searchFilterContext = searchCommonParameters.UserSessionQuery;

    //4. Put the request together

    let chartSearchCriteria = {};
    chartSearchCriteria.chartID = reportDefObject.uid;
    chartSearchCriteria.searchCriteria = searchCriteria;
    chartSearchCriteria.categoriesToChartOn = categoriesToChartOn;

    let graphQLInput = {};
    graphQLInput.searchFilterContext = searchFilterContext;
    graphQLInput.chartSearchCriteria = [ chartSearchCriteria ];

    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'query ChartInfo($input:ChartDataInput!){chartInfo(chartDataInput:$input){chartID,totalCount,chartData{categoryName,chartValues{label,value}}}}',
            variables: {
                input: graphQLInput
            }
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then(
        function( response ) {
            if( response.errors === undefined ) {
                var returnObject = {};
                var chartPoints = createChartGraphQLData( response.data.chartInfo[ 0 ].chartData, searchAndChartInfo.ChartConfiguration );
                returnObject.chartPoints = chartPoints;
                returnObject.displayTable = false;
                returnObject.displayChart = true;
                returnObject.totalObjectFound = data.i18n.totalObjectFound + ': ' + response.data.chartInfo[ 0 ].totalCount;
                returnObject.ChartConfiguration = searchAndChartInfo.ChartConfiguration;
                return returnObject;
            }
            logger.error( response.errors[ 0 ].message + '..initiating SOA call.' );
            return callPerformSearchForChartInfo( reportDefObject, data, searchAndChartInfo );
        },
        function( err ) {
            return callPerformSearchForChartInfo( reportDefObject, data, searchAndChartInfo ); //fallback in case TCGQL in not installed/running.
        } );
};

/**
 * Register the policy
 * @returns {any} policyId
 */
 var registerPolicy = function( repTable ) {
    //var reportDefs = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    var types = {};
    var typeList = [];
    if( repTable ) {
        var propList = repTable.ColumnPropInternalName;
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

/**
 *
 * @param {*} reportObject
 * @param {*} response
 * @param {*} searchAndChartInfo
 * @returns
 */
function createDynamicGridDefinition( reportObject, response, searchAndChartInfo ) {
    const gridId = reportObject.props.rd_id.dbValues[ 0 ] + '_' + reportObject.props.tileIndex.dbValue;
    const dataProviderId = 'dp_' + reportObject.props.rd_id.dbValues[ 0 ] + '_' + reportObject.props.tileIndex.dbValue;
    const columnProviderId = 'cp_' + reportObject.props.rd_id.dbValues[ 0 ] + '_' + reportObject.props.tileIndex.dbValue;

    const gridDef = {};
    gridDef[ gridId ] = {
        dataProvider: dataProviderId,
        columnProvider: columnProviderId,
        enableArrangeMenu: false,
        gridOptions: {
            enableGridMenu: false,
            //maxRowsToShow: reportObject.props.rd_type.dbValues[0] === '1' ? 6 : 7
            maxRowsToShow: 7
        }
    };

    const dpActionObj = {
        actionType: 'JSFunction',
        method: 'getTableData',
        inputData: {
            data: '{{data}}'
        },
        outputData: {
            totalFound: 'totalFound',
            searchResults: 'searchResults'
        },
        deps: 'js/myDashboardTileService'
    };

    const dataProviderDef = {};
    const dataProviderDefJson = {
        action: 'getTableData',
        response: '{{data.searchResults}}',
        totalFound: '{{data.totalFound}}',
        commandsAnchor: 'com.siemens.splm.clientfx.tcui.commands.modelObjectCellListActionCommands',
        selectionModelMode: 'multiple'
    };

    dataProviderDef[ dataProviderId ] = dataProviderFactory.createDataProvider( dataProviderDefJson,
        dpActionObj, dataProviderId, declDataProviderService );
    const columnProviderDef = { sortCriteria: [] };

    var columns = showReportSrvc.loadColumns( null, searchAndChartInfo.ChartConfiguration, 150 );
    columnProviderDef[ columnProviderId ] = { frozenColumnIndex: 1, columns };
    //var columnWidth = 150;
    //return showReportSrvc.loadColumns( dataprovider, data.ChartConfiguration, columnWidth );

    return {
        id: gridId,
        gridDefinition: gridDef,
        dataProviderDefinition: dataProviderDef,
        columnProviderDefinition: columnProviderDef,
        dataProviderId: dataProviderId,
        columnProviderId: columnProviderId
    };
}

/**
 * Makes a SOA call to get required Chart Info.
 * @param {*} reportDefObject -
 * @param {*} data -
 * @returns {*} chart info
 */
var callPerformSearchForChartInfo = function( reportDefObject, data, searchAndChartInfo ) {
    var searchSOAInput = getPerformSearchSOAInput( searchAndChartInfo );
    var policyId = 0;
    if( searchAndChartInfo.tileElement === 'Table' ) {
        policyId = registerPolicy( searchAndChartInfo.ChartConfiguration );
    }

    return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
        columnConfigInput: searchSOAInput.columnConfigInput,
        inflateProperties: false,
        saveColumnConfigData: { },
        noServiceData: false,
        searchInput: searchSOAInput.searchInput
    } ).then(
        function( response ) {
            if( reportDefObject !== null && reportDefObject.props.rd_type.dbValues[0] === '1' ) {
                eventBus.publish( 'reportDashboard.getSourceObject' );
            }
            if( searchAndChartInfo.tileElement === 'Chart' ) {
                appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', {} );
                var filterCat = showReportSrvc.callRepGetCategories( response );
                var searchResultFilters = undefined;
                if( appCtxService.ctx.ReportsContext.searchIncontextInfo && appCtxService.ctx.ReportsContext.searchIncontextInfo.searchResultFilters ) {
                    searchResultFilters = appCtxService.ctx.ReportsContext.searchIncontextInfo.searchResultFilters;
                }
                var searchFiltMap = response.searchFilterMap6;
                var chartPoints = moreRepSvc.createChartFromArrayOfSeriesInternal( searchResultFilters, filterCat, searchFiltMap, searchAndChartInfo.ChartConfiguration );

                response.chartPoints = chartPoints;
                response.displayTable = false;
                response.displayChart = true;
                response.totalObjectFound = data.i18n.totalObjectFound + ': ' + response.totalFound;
                response.ChartConfiguration = searchAndChartInfo.ChartConfiguration;
                response.isActiveItem = reportDefObject.props.rd_type.dbValues[0] === '1';
                return response;
            } else if( searchAndChartInfo.tileElement === 'Table' ) {
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

                if( reportDefObject !== null ) {
                    var gridDef = createDynamicGridDefinition( reportDefObject, response, searchAndChartInfo );
                    response.id = gridDef.id;
                    response.gridDefinition = gridDef.gridDefinition;
                    response.dataProviderDefinition = gridDef.dataProviderDefinition;
                    response.columnProviderDefinition = gridDef.columnProviderDefinition;
                    response.dataProviderId = gridDef.dataProviderId;
                    response.columnProviderId = gridDef.columnProviderId;

                    response.displayTable = true;
                    response.displayChart = false;

                    response.totalObjectFound = data.i18n.totalObjectFound + ': ' + response.totalFound;
                    response.ChartConfiguration = searchAndChartInfo.ChartConfiguration;
                    response.searchAndChartInfo = searchAndChartInfo;
                    response.isActiveItem = reportDefObject.props.rd_type.dbValues[0] === '1';
                }
                return response;
            }
        },
        function( error ) {
            logger.error( 'Error occurred ' + error );
        }
    );
};

/**
 * Initializes Report Tile rendering.
 *
 * @param {*} subPanelContext - subPanelContext
 * @param {*} data - data
 * @returns {*} reportName
 */
export let dashboardTileRevealed = function( subPanelContext, data ) {
    var searchAndChartInfo = getReportSearchAndChartParametersForTile( subPanelContext );
    searchAndChartInfo.startIndex = 0;
    searchAndChartInfo.searchSortCriteria = '';
    if( subPanelContext.props.translatedBaseCriteria && subPanelContext.props.translatedBaseCriteria.dbValue !== null && searchAndChartInfo.tileElement === 'Chart' && subPanelContext.props.rd_type.dbValues[0] === '4' ) {
        return callChartInfoGql( subPanelContext, data, searchAndChartInfo );
    } else if( subPanelContext ) {
        if( searchAndChartInfo.tileElement === 'Table' ) {
            var dashboardPage = $( 'body' ).find( 'aw-include[name=showMyDashboardImage]' );
            if( dashboardPage && dashboardPage[ 0 ] ) {
                //var dashboardTiles = dashboardPage[0].getElementsByClassName( 'aw-reports-dashboardTileContent aw-widgets-cellListWidget aw-widgets-cellListItem' );
                var dashboardTiles = dashboardPage[ 0 ].getElementsByClassName( 'aw-widgets-cellListWidget aw-layout-flexColumnContainer' );
                var repIndex = parseInt( subPanelContext.props.tileIndex.dbValue );
                if( dashboardTiles && dashboardTiles.length > 0 && dashboardTiles[ 0 ].children.length > repIndex ) {
                    dashboardTiles[ 0 ].children[ repIndex ].style.minWidth = '832px';
                }
            }
        }
        return callPerformSearchForChartInfo( subPanelContext, data, searchAndChartInfo );
    }
};

/**
 * createChartGraphQLData
 *
 /*
        Format of searchResultFilters:
        dataPoints: [
            {
                categoryName: categoryName,
                facetValues: [
                    {
                    "label": "Tcadmin, testuser ( tcadmin )",
                    "value": 49259
                    },
                    {
                    "label": "Bhardwaj, Sudhir ( bhardwaj )",
                    "value": 36715
                    }...]
            },{},{}]
 *
 * @function createChartGraphQLData
 * @param {ObjectArray} searchResultFilters searchResultFilters
 * @param {*} reportConfig reportConfig
 * @returns {*} chart series data
 */
export let createChartGraphQLData = function( searchResultFilters, reportConfig ) {
    let arrayOfSeriesDataForChart = [];

    if( searchResultFilters === undefined || searchResultFilters.length === 0 ) {
        return arrayOfSeriesDataForChart;
    }
    let keyValueDataForChart = [];

    var searchResultChartValues = searchResultFilters[0].chartValues;
    // for every data point create a label and value
    searchResultChartValues.forEach( element => {
        keyValueDataForChart.push( {
            label: element.label,
            name: element.label,
            value: element.value
        } );
    } );

    // push series of datapoints to entire chart series array
    arrayOfSeriesDataForChart.push( {
        seriesName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName,
        keyValueDataForChart: keyValueDataForChart
    } );
    return arrayOfSeriesDataForChart;
};

/**
 * Returns chart
 * @param {*} data -
 * @return {*} chart points
 */
export let getChartDataAction = function( data ) {
    data.chartProviders.myChartProvider.title = data.ChartConfiguration.ChartTitle;
    data.chartProviders.myChartProvider.chartType = data.ChartConfiguration.ChartTpIntName;
    return data.chartPoints;
};

export let getTableData = function( data ) {
    var tableDp = data.dataProviders[ data.dataProviderId ];
    var tableColumnPr = data.columnProviders[ data.columnProviderId ];
    if( tableDp && tableColumnPr ) {
        var startIndex = tableDp.startIndex;
        var searchSortCriteria = tableColumnPr.sortCriteria;
        if( data.searchResults && startIndex === 0 && searchSortCriteria === undefined ) {
            return {
                searchResults: data.searchResults,
                totalFound: data.totalFound
            };
        }

        let tempSearchAndChartInfo = data.searchAndChartInfo;
        tempSearchAndChartInfo.startIndex = startIndex;

        if( searchSortCriteria !== undefined && searchSortCriteria.length > 0 ) {
            searchSortCriteria[ 0 ].fieldName = showReportSrvc.getValidSortCriteriaField( searchSortCriteria[ 0 ], tableColumnPr );
            tempSearchAndChartInfo.searchSortCriteria = searchSortCriteria;
        }
        return callPerformSearchForChartInfo( null, data, tempSearchAndChartInfo );
    }
        return {
            searchResults: [],
            totalFound: 0
        };
};

export let getSourceObject = function( sourceUid, data ) {
    if( sourceUid !== undefined ) {
        var deferred = AwPromiseService.instance.defer();
        dmSvc.loadObjects( [ sourceUid ] ).then( function() {
            var sourceObj = cdm.getObject( sourceUid );
            data.reportSource.propertyDisplayName = sourceObj.props.object_string.dbValues[ 0 ];
            var showlink = true;
            deferred.resolve( showlink );
        } );
        return deferred.promise;
    }
        var deferred = AwPromiseService.instance.defer();
        deferred.resolve( false );
        return deferred.promise;
};

export default exports = {
    getChartDataAction,
    dashboardTileRevealed,
    getTableData,
    getSourceObject
};
app.factory( 'mydashboardtileservice', () => exports );
