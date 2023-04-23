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
 * JS Service defined to handle Add Report related method execution only.
 *
 * @module js/addNewReportService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import soaService from 'soa/kernel/soaService';
import navigationUtils from 'js/navigationUtils';
import myDashboardSrvc from 'js/showMyDashboardService';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Open newly created report object to enable its configuration
 *
 * @param {any} chartReportObject - The newly created ReportDefinition object.
 */
export let openNewReportObject = function( chartReportObject ) {
    if( appCtxService.ctx.sublocation.nameToken === 'com.siemens.splm.reports:showMyDashboard' && chartReportObject[0].props.rd_type.dbValues[0] === '4'  ) {
        myDashboardSrvc.addSelectedReportToDashboard( chartReportObject[0], chartReportObject[ 0 ].props.rd_id.dbValues, 'TC' );
    }
    var toParams = {};
    var options = {};
    var shownewReport = 'showReport';

    toParams.uid = chartReportObject[ 0 ].uid;
    toParams.title = chartReportObject[ 0 ].props.rd_name.dbValues;
    toParams.reportId = chartReportObject[ 0 ].props.rd_id.dbValues;
    toParams.configure = 'true';
    toParams.referenceId = 'new';
    toParams.reportType = chartReportObject[0].props.rd_type.dbValues[0];
    options.inherit = false;
    AwStateService.instance.go( shownewReport, toParams, options );
};

/**
 * Call SOA and get the next available Report Id.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let getAndUpdateReportId = function( data ) {
    var soaInput = {
        inputCriteria: [ {
            category: 'SummaryReport',
            clientId: '',
            source: '',
            status: ''
        } ]
    };
    soaService.postUnchecked( 'Reports-2007-01-CrfReports', 'generateReportDefintionIds', soaInput ).then(
        function( response ) {
            data.reportId.dbValue = response.reportdefinitionIds[0].reportDefinitionId;
            data.reportId.uiValue = response.reportdefinitionIds[0].reportDefinitionId;
        },
        function( error ) {
            data.error = error;
        } );
};

/**
 * Get Type value for new Report
 * @param {*} data -
 * @returns {int} repType - Type value
 */
export let getReportType = function( data ) {
    if( data.reportType.dbValue === 'AdvanceSummaryReport' ) {
        return 4;
    } else if( data.reportType.dbValue === 'AdvanceItemReport' ) {
        return 1;
    }
};

/**
 * @param  {any} data - the
 * @param  {any} selectedReport - selected report
 * @returns {any} encodedParamString
 */
export let getEscapedUrlParameters = function( data, selectedReport ) {
    var reportParam = {};
    reportParam.title = selectedReport.props.rd_name.dbValues;
    reportParam.reportId = selectedReport.props.rd_id.dbValues;
    reportParam.uid = selectedReport.uid;
    reportParam.configure = false;
    return navigationUtils.buildEncodedParamString( 'showReport', reportParam );
};

/**
 * Service variable initialization
 *
 * @param {any} $state - The state Service
 * @param {any} soaService - The SOA Service
 * @returns {any} exports - The exports object
 */

export default exports = {
    openNewReportObject,
    getAndUpdateReportId,
    getEscapedUrlParameters,
    getReportType
};
app.factory( 'addnewreportservice', () => exports );
