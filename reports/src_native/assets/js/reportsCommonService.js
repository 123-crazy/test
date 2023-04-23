// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This service implements commonly used functions by Reports module.
 *
 * @module js/reportsCommonService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import adapterService from 'js/adapterService';

//################# ALL STRING CONSTANTS ###################
var m_reportPersistCtx = 'ReportsPersistCtx';
var m_dashboardCtxList = 'ReportsPersistCtx.MyDashboardReportList';
var m_reportDashboardPrefName = 'REPORT_AW_MyDashboard_TC_Report';
var m_ctxPrefName = 'preferences.' + m_reportDashboardPrefName;
var m_awSourceName = 'Active Workspace';
var m_repCtxSearchInfo = 'ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo';
var m_reportChart1 = 'ReportChart1';
var m_reportChart2 = 'ReportChart2';
var m_reportChart3 = 'ReportChart3';
var m_reportTable1 = 'ReportTable1';

export let getReportDashboardPrefName = function() {
    return m_reportDashboardPrefName;
};

export let getAWReportSourceName = function() {
    return m_awSourceName;
};

export let getCtxForReportsPreference = function() {
    return m_ctxPrefName;
};

export let getCtxMyDashboardList = function() {
    return m_dashboardCtxList;
};

export let getReportsCtxSearchInfo = function() {
    return m_repCtxSearchInfo;
};

export let getReportChart1 = function() {
    return m_reportChart1;
};

export let getReportChart2 = function() {
    return m_reportChart2;
};

export let getReportChart3 = function() {
    return m_reportChart3;
};

export let getReportTable1 = function() {
    return m_reportTable1;
};


//###################### END ################################
var exports = {};


export let setupReportPersistCtx = function() {
    if ( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report !== null && appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report.length > 0
        && appCtxService.ctx[m_reportPersistCtx] === undefined ) {
        var reports = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
        var rdIdList = [];
        reports.forEach( element => {
            if ( element.length !== 0 ) {
                var val = JSON.parse( element.substring( element.indexOf( ':' ) + 1, element.length ) );
                if ( val.sourceObjUid !== undefined ) {
                    rdIdList.push( val.ID + val.sourceObjUid );
                } else {
                    rdIdList.push( val.ID );
                }
            }
        } );
        appCtxService.updatePartialCtx( m_dashboardCtxList, rdIdList );
    } else if ( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report === null ) {
        appCtxService.updatePartialCtx( m_dashboardCtxList, [] );
    }
};

export let getRelationTraversalType = function( segment, ctxParams ) {
    var refProp = '';
    if ( segment && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 && segment.props.fnd0RelationOrReference.selectedLovEntries[0].propDisplayDescription.endsWith( '(Reference)' ) ) {
        refProp = 'REF';
    } else if ( segment && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 && segment.props.fnd0RelationOrReference.selectedLovEntries[0].propDisplayDescription.endsWith(
        '(Relation)' ) && segment.props.fnd0Direction.dbValue === 'true' ) {
        refProp = 'GRM';
    } else if ( segment && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 && segment.props.fnd0RelationOrReference.selectedLovEntries[0].propDisplayDescription.endsWith(
        '(Relation)' ) && segment.props.fnd0Direction.dbValue === 'false' ) {
        refProp = 'GRMS2P';
    } else if( ctxParams && ctxParams.ReportDefProps && ctxParams.ReportDefProps.ReportSegmentParams && ctxParams.ReportDefProps.ReportSegmentParams.length > 0 &&
        ctxParams.ReportDefProps.ReportSegmentParams.length > segment.index - 1 ) {
        refProp = ctxParams.ReportDefProps.ReportSegmentParams[segment.index - 1].RelRefType;
    }
    if ( segment.bomInSegment ) {
        refProp = 'BOM';
    }
    if ( segment.props.fnd0Direction.dbValue === 'bom' ) {
        refProp = 'BOM';
    }
    return refProp;
};

/**
 * Gets the underlying object for the selection. For selection of an occurrence in a BOM, the underlying object is
 * typically an Item Revision object. If there is no underlying object, the selected object is returned.
 *
 * @param {object} ctx - Application Context
 *
 */
export let getUnderlyingObject = function( ctx ) {
    var underlyingObj = null;
    if ( ctx ) {
        underlyingObj = ctx;

        var srcObjs = adapterService.getAdaptedObjectsSync( [ ctx ] );
        if ( srcObjs !== null && srcObjs.length > 0 ) {
            underlyingObj = srcObjs[0];
        }
    }
    return underlyingObj;
};

export let getReportUpdateTime = ( data ) => {
    let month_short = [];
    month_short.push( data.i18n.rep_month_Jan );
    month_short.push( data.i18n.rep_month_Feb );
    month_short.push( data.i18n.rep_month_Mar );
    month_short.push( data.i18n.rep_month_Apr );
    month_short.push( data.i18n.rep_month_May );
    month_short.push( data.i18n.rep_month_Jun );
    month_short.push( data.i18n.rep_month_Jul );
    month_short.push( data.i18n.rep_month_Aug );
    month_short.push( data.i18n.rep_month_Sep );
    month_short.push( data.i18n.rep_month_Oct );
    month_short.push( data.i18n.rep_month_Nov );
    month_short.push( data.i18n.rep_month_Dec );

    var currentdate = new Date();
    return ' ' + ( '0' + currentdate.getDate() ).slice( -2 ) + '-' + //get date in 2 digit like 01
        month_short[currentdate.getMonth()] + '-' +
        currentdate.getFullYear() + ' ' +
        currentdate.getHours() + ':' +
        currentdate.getMinutes();
};

/**
 * reportsCommonService factory
 *
 */
export default exports = {
    getReportDashboardPrefName,
    getAWReportSourceName,
    getCtxForReportsPreference,
    getCtxMyDashboardList,
    getReportsCtxSearchInfo,
    setupReportPersistCtx,
    getReportChart1,
    getReportChart2,
    getReportChart3,
    getRelationTraversalType,
    getReportTable1,
    getUnderlyingObject,
    getReportUpdateTime
};
app.factory( 'reportsCommonService', () => exports );

