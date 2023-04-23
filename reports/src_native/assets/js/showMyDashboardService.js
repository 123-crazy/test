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
 * JS Service defined to handle Show My Dashboard related method execution only.
 *
 * @module js/showMyDashboardService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import soaService from 'soa/kernel/soaService';
import reportsCommSrvc from 'js/reportsCommonService';
import modelPropertySvc from 'js/modelPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import viewModelService from 'js/viewModelObjectService';

var exports = {};
var _reportsList = null;
var _pageSize = 8;
var _totalLoaded = -1;

export let getReportDefinitionSOAInput = function( data, reportIdInput = 'reportDefinitionId', subPanelContext ) {
    var repIdList = [];
    var preference = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    var preference_Name = reportsCommSrvc.getReportDashboardPrefName();

    if( subPanelContext && subPanelContext.preferenceName && appCtxService.ctx.preferences[ subPanelContext
            .preferenceName ] !== undefined ) {
        preference_Name = subPanelContext.preferenceName;
        preference = appCtxService.ctx.preferences[ preference_Name ];
    }

    if( 'preferences' in appCtxService.ctx && preference_Name in appCtxService.ctx.preferences ) {
        repIdList.push.apply( repIdList, preference );
    }

    //scenario for no report configured
    if( repIdList.length === 1 && repIdList[ 0 ].length === 0 ) {
        repIdList = [];
    }

    var soaInput = [];
    if( repIdList.length > 0 ) {
        repIdList.forEach( idVal => {
            var val = JSON.parse( idVal.substring( idVal.indexOf( ':' ) + 1, idVal.length ) );
            var inputStr = {};
            inputStr[ reportIdInput ] = val.ID;
            if( reportIdInput === 'reportID' ) {
                inputStr.reportUID = '';
                inputStr.reportSource = '';
            }
            soaInput.push( inputStr );
        } );
    } else {
        var inputStr = {};
        inputStr[ reportIdInput ] = 'RANDOME###$$$$';
        inputStr.reportUID = '';
        inputStr.reportSource = '';
        soaInput.push( inputStr );
    }
    reportsCommSrvc.setupReportPersistCtx();
    return soaInput;
};

export let getReportDefinitionValList = function( response ) {
    _reportsList = response.reportdefinitions.filter( function( rDef ) {
        var repDefObj = response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
        return repDefObj.props.rd_type.dbValues[ 0 ] !== '1';
    } ).map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
    } );
    appCtxService.updatePartialCtx( 'search.totalFound', _reportsList.length );
    return {
        reportdefinitions: _reportsList
    };
};

export let setupDashboardReportViewer = function( data ) {
    data.urlFrameSize = getFrameSize();
    $( 'aw-secondary-workarea' ).find( '.aw-jswidget-tabBar' ).addClass( 'aw-viewerjs-hideContent' );
};

var getFrameSize = function() {
    var areas = document.getElementsByTagName( 'aw-secondary-workarea' );
    if( areas.length > 0 ) {
        var totalHeight = areas[ 0 ].clientHeight - 23;
        var totalWidth = areas[ 0 ].clientWidth - 20;
    }
    return {
        height: totalHeight,
        width: totalWidth
    };
};

//
export let getPreferenceIndex = function( prefvalList, rd_id ) {
    for( var j = 0; j < prefvalList.length; j++ ) {
        if( prefvalList[ j ].startsWith( rd_id ) ) {
            return j;
        }
    }
    return -1;
};

//TODO Refactor
export let removeSelectedDashboardReport = function( selectedReportDef, ctxReportDef, cmdCtx, preferenceName ) {
    var currentPrefValList = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    var preference_Name = reportsCommSrvc.getReportDashboardPrefName();
    if( preferenceName && appCtxService.ctx.preferences[ preferenceName ] !== null && appCtxService.ctx.preferences[ preferenceName ] !== undefined ) {
        currentPrefValList = appCtxService.ctx.preferences[ preferenceName ];
        preference_Name = preferenceName;
    }
    if( selectedReportDef === null && cmdCtx && cmdCtx.type !== undefined ) {
        selectedReportDef = cmdCtx;
    } else if( selectedReportDef === null && ctxReportDef ) {
        selectedReportDef = ctxReportDef;
    }
    var chkPrefValue = selectedReportDef.props.rd_type.dbValues[ 0 ] === '1' ? selectedReportDef.props.rd_id.dbValues[ 0 ] + selectedReportDef.props.rd_sourceObject.dbValue : selectedReportDef.props
        .rd_id.dbValues[ 0 ];
    var index = getPreferenceIndex( currentPrefValList, chkPrefValue );
    currentPrefValList.splice( index, 1 );

    var setLocation = [];
    setLocation.push( {
        location: {
            object: '',
            location: 'User'
        },
        preferenceInputs: {
            preferenceName: preference_Name,
            values: currentPrefValList.length === 0 ? null : currentPrefValList
        }
    } );
    var inputData = {
        setPreferenceIn: setLocation
    };
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', inputData ).then(
        function( response ) {
            appCtxService.updatePartialCtx( 'preferences.' + preference_Name, currentPrefValList.length === 0 ? null : currentPrefValList );
            if( preference_Name === 'REPORT_AW_MyDashboard_TC_Report' ) {
                var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
                crntList.splice( index, 1 );
                appCtxService.updatePartialCtx( reportsCommSrvc.getCtxMyDashboardList(), crntList );
            }
            eventBus.publish( 'primaryWorkarea.reset' );
        } );
};

//TODO Refactor
export let addSelectedReportToDashboard = function( selectedReportDef, reportId, source, preferenceName ) {
    var currentPrefValList = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    var preference_Name = reportsCommSrvc.getReportDashboardPrefName();
    if( preferenceName && appCtxService.ctx.preferences[ preferenceName ] !== undefined ) {
        currentPrefValList = appCtxService.ctx.preferences[ preferenceName ];
        preference_Name = preferenceName;
    }
    if( currentPrefValList === null || currentPrefValList.length === 1 && currentPrefValList[ 0 ].length === 0 ) {
        currentPrefValList = [];
    }

    var ctxItem = null;
    if( selectedReportDef && selectedReportDef.type !== 'ReportDefinition' && appCtxService.ctx.ReportsContext ) {
        //get uid of selected item
        var ctxSelItem = reportsCommSrvc.getUnderlyingObject( selectedReportDef );
        ctxItem = ctxSelItem.uid;

        //now re-assign reportDef variable
        selectedReportDef = appCtxService.ctx.ReportsContext.selected;

        //Remove command..
        appCtxService.updatePartialCtx( 'showAddToDashboardCommand', false );
    }

    //Compile preference value in case of TC report
    var reportIdVal = selectedReportDef !== null ? selectedReportDef.props.rd_id.dbValues[ 0 ] : reportId;
    if( source === 'TC' && ctxItem === null ) {
        currentPrefValList[ currentPrefValList.length ] = reportIdVal + ':{"ID":"' + reportIdVal + '"}';
    } else if( source === 'TC' && ctxItem !== null ) {
        var prefKey = reportIdVal + ctxItem;
        currentPrefValList[ currentPrefValList.length ] = prefKey + ':{"ID":"' + reportIdVal + '",' + '"sourceObjUid":"' + ctxItem + '"}';
        //update id value for persist CTX..
        reportIdVal = prefKey;
    } else if( source === 'TcRA' ) {
        currentPrefValList[ currentPrefValList.length ] = reportId;
    }

    var setLocation = [];
    setLocation.push( {
        location: {
            object: '',
            location: 'User'
        },
        preferenceInputs: {
            preferenceName: preference_Name,
            values: currentPrefValList
        }
    } );
    var inputData = {
        setPreferenceIn: setLocation
    };
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', inputData ).then(
        function( response ) {
            appCtxService.updatePartialCtx( 'preferences.' + preference_Name, currentPrefValList );
            if( preference_Name === 'REPORT_AW_MyDashboard_TC_Report' ) {
                var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
                crntList.push( reportIdVal );
                appCtxService.updatePartialCtx( reportsCommSrvc.getCtxMyDashboardList(), crntList );
            } else {
                eventBus.publish( 'primaryWorkarea.reset' );
            }
        } );
};

//################# MY DASHBOARD TILE VIEW METHODS ####################
/**
 *  fsd
 * @param {*} startIndex -
 * @returns {*} cursorObject
 */
var getCursorObject = function( startIndex ) {
    var totalFound = _reportsList.length;
    var mEndIndex = null;
    var mEndReached = null;

    if( startIndex === 0 ) {
        if( totalFound === _pageSize ) {
            mEndIndex = _pageSize;
            mEndReached = true;
        }
        if( totalFound > _pageSize ) {
            mEndIndex = _pageSize;
            mEndReached = false;
        } else {
            mEndIndex = totalFound;
            mEndReached = true;
        }
    } else {
        if( _pageSize + startIndex > totalFound ) {
            mEndIndex = totalFound;
            mEndReached = true;
        } else {
            mEndIndex = _pageSize + startIndex;
            mEndReached = false;
        }
    }
    return {
        endIndex: mEndIndex,
        endReached: mEndReached,
        startIndex: startIndex,
        startReached: true
    };
};


/**
 *
 * @param {*} data -
 */
var updateDashboardLastRefreshTime = function( data ) {
    var datetime = reportsCommSrvc.getReportUpdateTime( data );
    data.dashboardLastRefresh.displayValues = [ datetime ];
    data.dashboardLastRefresh.uiValue = datetime;
    data.dashboardLastRefresh.dbValue = datetime;
};

var addSearchRecipeProps = function( reportDef, recipe, index ) {
    var props = [ 'reportChartObjects', 'translatedBaseCriteria', 'translatedFilterQueries', 'reportSearchRecipeExtraInfo' ];

    props.forEach( propName => {
        //set search receipe as a property value..
        var propAttrHolder = {
            displayName: propName,
            type: 'STRING',
            dbValue: recipe[ propName ]
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        reportDef.props[ propName ] = property;
    } );

    if( reportDef.props.rd_type.dbValues[ 0 ] === '1' ) {
        const repIndex = parseInt( recipe.reportSearchRecipeExtraInfo.reportIndex );
        //get source uid value from preference and add it as a propValue
        // var prefValue = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report[index];
        // var prefValJSON = JSON.parse( prefValue.substring( prefValue.indexOf( ':' ) + 1, prefValue.length ) );
        // var propAttrHolder = {
        //     displayName: 'rd_sourceObject',
        //     type: 'STRING',
        //     dbValue: prefValJSON.sourceObjUid
        // };
        // var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        // reportDef.props.rd_sourceObject = property;

        //var uidNew = reportDef.uid.substring( 0, 0 ) + '0' + reportDef.uid.substring( 0 + 1 );
        //reportDef.uid = uidNew;
        //s.substring(0, index) + 'x' + s.substring(index + 1);
        //var newReportDef = JSON.parse( JSON.stringify( reportDef ) );
        //reportDef = newReportDef;
        var modelObject = {};
        modelObject.uid = 'unstaffedUI' + recipe.reportSearchRecipeExtraInfo.reportIndex;
        modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );

        modelObject.props = reportDef.props;
        modelObject.type = reportDef.type;
        modelObject.modeType = reportDef.modeType;
        // var uidNew = finalRepList[i].uid.substring( 0, 0 ) + i.toString() + finalRepList[i].uid.substring( 0 + 1 );
        // finalRepList[i].uid = uidNew;
        // //s.substring(0, index) + 'x' + s.substring(index + 1);
        // listWithIndex[ i ] = JSON.parse( JSON.stringify( finalRepList[ i ] ) );
        var prefValue = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report[ repIndex ];
        var prefValJSON = JSON.parse( prefValue.substring( prefValue.indexOf( ':' ) + 1, prefValue.length ) );
        var propAttrHolder = {
            displayName: 'rd_sourceObject',
            type: 'STRING',
            dbValue: prefValJSON.sourceObjUid
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        modelObject.props.rd_sourceObject = property;
        //listWithIndex.push( JSON.parse( JSON.stringify( modelObject ) ) );
        reportDef = JSON.parse( JSON.stringify( modelObject ) );
    }

    return reportDef;
};

var getReportDefinitions = function( response ) {
    var index = 0;
    _reportsList = response.reportSearchRecipeObjects.map( function( receipe ) {
        var reportDef = response.ServiceData.modelObjects[ receipe.reportObject.uid ];
        var propAttrHolder = {
            displayName: 'tileIndex',
            type: 'STRING',
            dbValue: index.toString()
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        reportDef.props.tileIndex = property;
        index++;
        return addSearchRecipeProps( reportDef, receipe, index - 1 );
    } );
    appCtxService.updatePartialCtx( 'search.totalFound', _reportsList.length );
    return {
        reportdefinitions: _reportsList
    };
};

/**
 * Main entry point for Rendering Report Tiles.
 * Performs the SOA call to get required ReportDefinition BO's.
 * For Sub-sequent scroll, next set of RD are returned.
 * @param {*} data - data
 * @param {*} startIndex - Scroll index value
 * @returns {*} List of ReportDefinition and cursor object.
 */
export let getReportDefinitionsForTileView = function( data, startIndex, subPanelContext ) {
    //Get dashboard update time..
    updateDashboardLastRefreshTime( data );
    if( data.preferences.REPORT_AW_MyDashboard_PageSize ) {
        _pageSize = parseInt( data.preferences.REPORT_AW_MyDashboard_PageSize[ 0 ] );
    }
    console.log( 'New call with startIndex ' + startIndex );

    //Tile config ReportDefinition processing
    if( startIndex === 0 ) {
        ////get SOA input
        var soaInput = getReportDefinitionSOAInput( data, 'reportID', subPanelContext );
        return soaService.postUnchecked( 'Internal-Search-2020-12-SearchFolder', 'getTranslatedReportSearchRecipe', {
            reportDefinitionCriteria: soaInput
        } ).then(
            function( response ) {
                var repDefList = getReportDefinitions( response );
                var finalRepList = repDefList.reportdefinitions.slice( 0, _pageSize );

                // var listWithIndex = [];

                // for( var i = 0; i < finalRepList.length; i++ ) {
                //     var modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );
                //     modelObject.uid = 'unstaffedUI' + i.toString();

                //     modelObject.props = finalRepList[i].props;
                //     modelObject.type = finalRepList[i].type;
                //     modelObject.modeType = finalRepList[i].modeType;
                //     // var uidNew = finalRepList[i].uid.substring( 0, 0 ) + i.toString() + finalRepList[i].uid.substring( 0 + 1 );
                //     // finalRepList[i].uid = uidNew;
                //     // //s.substring(0, index) + 'x' + s.substring(index + 1);
                //     // listWithIndex[ i ] = JSON.parse( JSON.stringify( finalRepList[ i ] ) );
                //     var prefValue = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report[ i ];
                //     var prefValJSON = JSON.parse( prefValue.substring( prefValue.indexOf( ':' ) + 1, prefValue.length ) );
                //     var propAttrHolder = {
                //         displayName: 'rd_sourceObject',
                //         type: 'STRING',
                //         dbValue: prefValJSON.sourceObjUid
                //     };
                //     var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
                //     modelObject.props.rd_sourceObject = property;
                //     listWithIndex.push( JSON.parse( JSON.stringify( modelObject ) ) );
                //     //finalRepList[ i ].uid = prefValJSON.sourceObjUid;
                //     //listWithIndex[i] =  viewModelObjectService.constructViewModelObject(  finalRepList[ i ], false );
                // }
                let showLastUpdateTime = subPanelContext.showLastUpdateTime !== undefined ? subPanelContext.showLastUpdateTime : true;
                appCtxService.updatePartialCtx( 'ReportsContext.SearchParameters', response.commonSearchParameters );
                _totalLoaded = finalRepList.length;
                return {
                    reportdefinitions: finalRepList,
                    cursor: getCursorObject( startIndex ),
                    showLastUpdateTm: showLastUpdateTime
                };
            } );
    } else if( startIndex > 0 ) {
        startIndex = _totalLoaded;
        var tempRepList = _reportsList.slice( startIndex, startIndex + _pageSize );
        _totalLoaded += tempRepList.length;
        return {
            reportdefinitions: tempRepList,
            cursor: getCursorObject( startIndex )
        };
    }
};

//################# MY DASHBOARD TILE VIEW METHODS END #################

export default exports = {
    getReportDefinitionValList,
    getReportDefinitionSOAInput,
    setupDashboardReportViewer,
    removeSelectedDashboardReport,
    addSelectedReportToDashboard,
    getPreferenceIndex,
    getReportDefinitionsForTileView
};

app.factory( 'showmydashboardservice', () => exports );
