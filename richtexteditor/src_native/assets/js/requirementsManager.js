//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/requirementsManager
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import fullModeServ from 'js/fullViewModeService';

var exports = {};
var chartData = [];
var chartMap = {};
var loadedVMObjects = [];
var HIDE_CSS = 'aw-viewerjs-hideContent';

/**
 * Set subType in listbox
 * 
 * @function getSearchId
 * @param {Object} data - The panel's view model object
 * @return {Object} - updated data elements
 */
export let setSubType = function( data ) {
    loadedVMObjects = [];
    data.filterChips = [];
    data.filterBox.dbValue = '';
    eventBus.publish( 'requirementsManager.loadRecentRequirementsAction' );
    return {
        lastEndIndex: '',
        totalFound: '',
        filterBox: data.filterBox
    };
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
 * Initialize strings for chartMap
 *
 * @param {Object} data - The view model data
 */
var _initializeChartMap = function( data ) {
    chartMap.assigned = data.i18n.assigned;
    chartMap.unassigned = data.i18n.notAssigned;
    chartMap.open = data.i18n.open;
    chartMap.replied = data.i18n.replied;
    chartMap.resolved = data.i18n.resolved;
    chartMap.rejected = data.i18n.rejected;
    chartMap.reopened = data.i18n.reopened;
};


/**
 * Get all object types from preference
 *
 * @param {Object} data - The view model data
 * @return {Object} objectTypeList - object types list
 */
export let updateObjectTypeList = function( data ) {
    _initializeChartMap( data );
    var searchTypes = data.preferences.REQ_DashboardSearchTypes;
    var listModel = {};
    var objectTypeList = {
        type: 'STRING',
        dbValue: []
    };

    if ( searchTypes && searchTypes.length > 0 ) {
        for ( var j = 0; j < searchTypes.length; j++ ) {
            listModel = _getEmptyListModel();
            listModel.propDisplayValue = searchTypes[j];
            listModel.propInternalValue = searchTypes[j];
            objectTypeList.dbValue.push( listModel );
        }
        listModel = _getEmptyListModel();
        listModel.propDisplayValue = data.i18n.all;
        listModel.propInternalValue = data.i18n.all;
        objectTypeList.dbValue.push( listModel );
    }
    return objectTypeList;
};


/**
 * Get all subtypes
 *
 * @param {Object} data - The view model data
 * @return {Object} objectTypes - object types string
 */
var _getAllSubTypes = function( data ) {
    var searchTypes = data.preferences.REQ_DashboardSearchTypes;
    var objectTypes = '';

    for ( var j = 0; j < searchTypes.length; j++ ) {
        objectTypes = objectTypes + searchTypes[j] + '; ';
    }

    return objectTypes.substring( 0, objectTypes.length - 2 );
};

/**
 * Get the Search criteria
 * 
 * @function getSearchId
 * @param {Object} data - The panel's view model object
 * @return {String} advanced search Id
 */
export let getSearchCriteria = function( data ) {
    var subType = data.subTypes.dbValue;
    if ( subType === data.i18n.all ) {
        subType = _getAllSubTypes( data );
    }
    var queryUID = data.lovValues[0].uid;
    var searchID = exports.getSearchId( queryUID );
    return {
        queryUID: queryUID,
        searchID: searchID,
        totalObjectsFoundReportedToClient: data.totalFound.toString(),
        typeOfSearch: 'ADVANCED_SEARCH',
        utcOffset: '330',
        lastEndIndex: data.lastEndIndex.toString(),
        Type: subType
    };
};

/**
 *  Creates the search ID for query
 * 
 * @param {String}queryUID - queryUID
 * @return {String} advanced search Id
 */
export let getSearchId = function( queryUID ) {
    //Unique Search ID: search_object_UID + logged_in_user_UID + current_time
    var userCtx = appCtxSvc.getCtx( 'user' );
    var loggedInUserUid = userCtx.uid;
    var timeSinceEpoch = new Date().getTime();
    return queryUID + loggedInUserUid + timeSinceEpoch;
};

/**
 *  Creates the search ID for query
 * 
 * @param {Object} data - The panel's view model object
 */
export let filterRecentList = function( data ) {
    if ( data.filterBox ) {
        var filteredText = data.filterBox.dbValue;
        var oldValue = data.eventData.oldValue;
        if ( oldValue === undefined ) {
            return;
        }
        if ( !filteredText ) {
            data.dataProviders.recentDataProvider.selectionModel.selectNone();
            data.dataProviders.recentDataProvider.update( loadedVMObjects, loadedVMObjects.length );
        } else {
            var vmos = [];
            for ( var i = 0; i < loadedVMObjects.length; i++ ) {
                var propInfo = loadedVMObjects[i];
                var propertyName = propInfo.cellHeader1.toLocaleLowerCase().replace( /\\|\s/g, '' );
                var filterValue = data.filterBox.dbValue.toLocaleLowerCase().replace( /\\|\s/g, '' );
                if ( propertyName.indexOf( filterValue ) !== -1 ) {
                    vmos.push( propInfo );
                }
            }
            data.dataProviders.recentDataProvider.update( vmos, vmos.length );
        }
    }
};

var _resetSelection = function( data, selected, vmo ) {
    var obj = cdm.getObject( vmo.uid );
    appCtxSvc.registerCtx( 'selected', obj );
    var selectionTitle = obj.props.object_name.dbValues[0];
    if ( selected && selected.uid !== vmo.uid ) {
        data.filterChips = [];
        appCtxSvc.unRegisterCtx( 'reqDashboardTable' );
        appCtxSvc.unRegisterCtx( 'reqDashboardTableColumnFilters' );
        eventBus.publish( 'showReqDashboardTable.refreshTable' );
        eventBus.publish( 'filtersDataProvider.reset' );
    }
    return selectionTitle;
};

/**
 * Sets the first item in the list as selected
 *
 * @param {Object} data - The panel's view model object
 * @return {String} selected object name
 */
export let setSelection = function( data ) {
    var selected = appCtxSvc.getCtx( 'selected' );
    var selectionTitle = selected && selected.props.object_name.dbValues[0];
    var dataProvider = data.dataProviders.recentDataProvider;
    if ( dataProvider ) {
        var vmo = dataProvider.viewModelCollection.getViewModelObject( 0 );
        if ( vmo && data.getConditionStates().setSelectionCondition ) {
            dataProvider.selectionModel.setSelection( vmo );
            selectionTitle = _resetSelection( data, selected, vmo );
            if( data.filterBox.dbValue === '' ) {
                loadedVMObjects = dataProvider.getViewModelCollection().loadedVMObjects;
            }
        }
    }
    return selectionTitle;
};


/**
 * Updates ctx selection to match list selection
 *
 * @param {Object} data - The panel's view model object
 * @return {String} selected object name
 */
export let updateCtxSelection = function( data ) {
    var selected = appCtxSvc.getCtx( 'selected' );
    var selectionTitle = selected && selected.props.object_name.dbValues[0];
    var dataProvider = data.dataProviders.recentDataProvider;
    if ( dataProvider ) {
        var vmo = dataProvider.selectionModel.getSelection()[0];
        if ( !vmo ) {
            vmo = dataProvider.viewModelCollection.getViewModelObject( 0 );
            dataProvider.selectionModel.setSelection( vmo );
        }
        if ( vmo && ( !selected || selected && selected.uid !== vmo.uid ) ) {
            selectionTitle = _resetSelection( data, selected, vmo );
        }
        var currentlyLoaded = dataProvider.getViewModelCollection().loadedVMObjects;
        if ( currentlyLoaded.length > loadedVMObjects.length ) {
            loadedVMObjects = currentlyLoaded;
        }
    }
    return selectionTitle;
};

/**
 * Retrieves the Workflow pie chart data
 *
 * @param {Object} data - The panel's view model object
 * @returns {*} chart series data
 */
export let createWorkflowPieChart = function( data ) {
    var reqDashboardTable = appCtxSvc.getCtx( 'reqDashboardTable' );
    chartData = reqDashboardTable.additionalSearchInfoMap.searchTermsToHighlight;

    var totalCountString = chartData[0];
    data.totalObjectsFound = parseInt( totalCountString.substring( totalCountString.indexOf( '=' ) + 1 ) );

    var statusCount = chartData.indexOf( 'ReqChart2' ) - chartData.indexOf( 'ReqChart1' ) - 1;
    var startIndex = chartData.indexOf( 'ReqChart1' ) + 1;
    var arrayOfSeriesDataForChart = [];
    var keyValueDataForChart = [];
    var allNull = true;
    for ( var i = startIndex; i < startIndex + statusCount; i++ ) {
        var vec_data = chartData[i];
        var prop = vec_data.substring( 0, vec_data.indexOf( ',' ) );
        var count = parseInt( vec_data.substring( vec_data.indexOf( ',' ) + 1 ) );
        if( data.filterChips.length === 0 ) {
            chartMap[prop] = prop;
        }
        keyValueDataForChart.push( {
            label: prop,
            value: count,
            name: prop
        } );
        if( count !== 0 && allNull === true ) {
            allNull = false;
        }
    }
    if( allNull === true ) {
        keyValueDataForChart = [];
    }
    arrayOfSeriesDataForChart.push( {
        name: data.i18n.workflowStatus,
        keyValueDataForChart: keyValueDataForChart,
        seriesName: data.i18n.workflowStatus
    } );
    return {
        arrayOfSeriesDataForChart: arrayOfSeriesDataForChart,
        totalObjectsFound: data.totalObjectsFound
    };
};
/**
 * Retrieves the TestCases pie chart data
 *
 * @param {Object} data - The panel's view model object
 * @returns {*} chart series data
 */
export let createTestCasesPieChart = function( data ) {
    var statusCount = chartData.indexOf( 'ReqChart3' ) - chartData.indexOf( 'ReqChart2' ) - 1;
    var startIndex = chartData.indexOf( 'ReqChart2' ) + 1;
    var arrayOfSeriesDataForChart = [];
    var keyValueDataForChart = [];
    var allNull = true;
    for ( var i = startIndex, j = 0; i < startIndex + 2 && i < startIndex + statusCount; i++, j++ ) {
        var vec_data = chartData[i];
        var prop = vec_data.substring( 0, vec_data.indexOf( ',' ) );
        var count = parseInt( vec_data.substring( vec_data.indexOf( ',' ) + 1 ) );
        keyValueDataForChart.push( {
            label: prop,
            value: count,
            name: chartMap[prop]
        } );
        if( count !== 0 && allNull === true ) {
            allNull = false;
        }
    }
    if( allNull === true ) {
        keyValueDataForChart = [];
    }
    arrayOfSeriesDataForChart.push( {
        name: data.i18n.testCoverage,
        keyValueDataForChart: keyValueDataForChart,
        seriesName: data.i18n.testCoverage
    } );
    return arrayOfSeriesDataForChart;
};
/**
 * Retrieves the Comments pie chart data
 *
 * @param {Object} data - The panel's view model object
 * @returns {*} chart series data
 */
export let createCommentsPieChart = function( data ) {
    var startIndex = chartData.indexOf( 'ReqChart3' ) + 1;
    var arrayOfSeriesDataForChart = [];
    var keyValueDataForChart = [];
    var allNull = true;
    for ( var i = startIndex, j = 0; i < startIndex + 5 && i < chartData.length; i++, j++ ) {
        var vec_data = chartData[i];
        var prop = vec_data.substring( 0, vec_data.indexOf( ',' ) );
        var count = parseInt( vec_data.substring( vec_data.indexOf( ',' ) + 1 ) );
        keyValueDataForChart.push( {
            label: prop,
            value: count,
            name: chartMap[prop]
        } );
        if( count !== 0 && allNull === true ) {
            allNull = false;
        }
    }
    if( allNull === true ) {
        keyValueDataForChart = [];
    }
    arrayOfSeriesDataForChart.push( {
        name: data.i18n.comments,
        keyValueDataForChart: keyValueDataForChart,
        seriesName: data.i18n.comments
    } );
    return arrayOfSeriesDataForChart;
};

var _resetContext = function( dashboardTableColumnFilters ) {
    appCtxSvc.registerCtx( 'reqDashboardTableColumnFilters', dashboardTableColumnFilters );
    appCtxSvc.unRegisterCtx( 'reqDashboardTable' );
    eventBus.publish( 'showReqDashboardTable.refreshTable' );
};

/**
 * This function is used to filter the Dasboard Table when a section of any pie chart is selected
 * 
 * @param {object} data data
 */
export let filterTable = function( data ) {
    var event = data.eventMap['undefined.selected'];
    if ( event.seriesName === data.i18n.workflowStatus || event.seriesName === data.i18n.testCoverage || event.seriesName === data.i18n.comments ) {
        var selectedLabel = event.label;
        var internalLabel = Object.keys( chartMap ).find( key => chartMap[key] === selectedLabel );
        var selected = appCtxSvc.getCtx( 'reqDashboardTableColumnFilters' );
        var filterChip = {
            uiIconId: 'miscRemoveBreadcrumb', chipType: 'BUTTON',
            labelDisplayName: event.seriesName + ': ' + selectedLabel,
            labelInternalName: internalLabel
        };
        var colValues = [];
        if ( selected && selected.length > 0 ) {
            colValues = selected[0].values;
        }
        if ( colValues.indexOf( internalLabel ) === -1 ) {
            data.filterChips.push( filterChip );
            colValues.push( internalLabel );
            var dashboardTableColumnFilters = [ {
                columnName: 'ChartFilter',
                operation: 'contains',
                values: colValues

            } ];
            _resetContext( dashboardTableColumnFilters );
        }
    }
};

/**
 * This function is used to filter/reset the Dasboard Table when a fliter chip is removed
 * 
 * @param {object} data data
 * @param {Array} filterChips Filter chips
 * @param {Object} chipToRemove Chip to remove
 */
export let removeTableFilter = function( data, filterChips, chipToRemove ) {
    var event = data.eventMap['undefined.selected'];
    filterChips.splice( filterChips.indexOf( chipToRemove ), 1 );
    data.filterChips = filterChips;
    var dashboardTableColumnFilters = appCtxSvc.getCtx( 'reqDashboardTableColumnFilters' );
    var colValues = [];
    if ( dashboardTableColumnFilters && dashboardTableColumnFilters.length > 0 ) {
        colValues = dashboardTableColumnFilters[0].values;
        colValues.splice( colValues.indexOf( chipToRemove.labelInternalName ), 1 );
    }
    if ( !dashboardTableColumnFilters || colValues.length === 0 ) {
        dashboardTableColumnFilters = [];
    }
    if ( event.seriesName === data.i18n.workflowStatus || event.seriesName === data.i18n.testCoverage || event.seriesName === data.i18n.comments ) {
        _resetContext( dashboardTableColumnFilters );
    }
};

/**
 * Process and remove unwanted tiles
 *
 * @param {response} response from getCurrentUserGateway2
 * @return {tileGroups} Tiles Groups
 */
 export let filterTiles = function( response ) {
    for ( let index = 0; index < response.tileGroups.length; index++ ) {
        if( response.tileGroups[index].groupName === 'rm2' ) {
            response.tileGroups.splice( index, 1 );
        }
    }
    return response.tileGroups;
};

/**
 * Toggles Full View Mode for Application. All other columns/sections other than charts/table section will
 * be hidden/displayed based on current view state.
 *
 * @function toggleApplicationFullScreenMode
 */
export let toggleApplicationFullScreenMode = function() {
    // Check if One Step Full Screen command is active
    var fullViewModeActive = appCtxSvc.getCtx( 'fullscreen' );
    var enabled = appCtxSvc.ctx.fullscreen && !appCtxSvc.ctx.aw_hosting_enabled;
    let splitterElement = document.querySelector( '.aw-requirementsmanager-splitter' );
    let verticalSplitter = document.querySelector( '.aw-requirementsmanager-verticalSplitter' );
    let tileElement = document.querySelector( '.aw-requirementsmanager-tiles' );
    let primarySection = document.querySelector( '.aw-requirementsmanager-primarySection' );

    if( fullViewModeActive ) {
        // Exit full screen mode -- addition

        splitterElement.classList.remove( HIDE_CSS );
        verticalSplitter.classList.remove( HIDE_CSS );
        tileElement.classList.remove( HIDE_CSS );
        primarySection.classList.remove( HIDE_CSS );

        // Update viewer command context
        var isFullScreenActive = fullModeServ.isFullViewModeActive( 'hidden' );
        fullModeServ.updateViewerCommandContext( 'fullViewMode', !isFullScreenActive );

        //Update application command context based on Selection and UiConfig Mode
        fullModeServ.updateApplicationCommandContext();
        fullModeServ.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        fullModeServ.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, false );
        // Update full screen command enabled state
        appCtxSvc.registerCtx( 'fullscreen', false );
    } else {
        /**
         * Update full screen command enabled state
         */

        splitterElement.classList.add( HIDE_CSS );
        verticalSplitter.classList.add( HIDE_CSS );
        tileElement.classList.add( HIDE_CSS );
        primarySection.classList.add( HIDE_CSS );

        fullModeServ.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        fullModeServ.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, true );

        //Update application command context
        fullModeServ.updateApplicationCommandContext();

        appCtxSvc.registerCtx( 'fullscreen', true );
        fullModeServ.updateViewerCommandContext( 'fullViewMode', false );
    }
};

/**
 * Service for requirementsManager.
 *
 * @member requirementsManager
 */

export default exports = {
    createWorkflowPieChart,
    createCommentsPieChart,
    createTestCasesPieChart,
    updateCtxSelection,
    setSelection,
    getSearchId,
    getSearchCriteria,
    filterTiles,
    filterTable,
    removeTableFilter,
    setSubType,
    filterRecentList,
    updateObjectTypeList,
    toggleApplicationFullScreenMode
};
app.factory( 'requirementsManager', () => exports );
