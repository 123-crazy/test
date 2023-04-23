// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/showReportBuilderReportsService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import reportCommnSrvc from 'js/reportsCommonService';
import cmdPanelSrvc from 'js/commandPanel.service';

var exports = {};

export let getReportDefinitionVal = function( response ) {
    if( appCtxService.ctx.chartProvider ) {
        delete appCtxService.ctx.chartProvider;
    }
    var reportDefinitions = response.reportdefinitions.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
    } ).filter( function( rd ) {
        return rd.props.rd_class.dbValues[ 0 ] === '' || rd.props.rd_class.dbValues[0] !== '' && rd.props.rd_type.dbValues[0] === '1' && rd.props.rd_source.dbValues[0] === 'Active Workspace';
    } );

    const userObj = appCtxService.getCtx( 'user' );
    const userName = userObj.uid;

    var owningUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[0] === userName;
    } );

    owningUserList = _.sortBy( owningUserList,  function( rDef ) {
        return rDef.props.creation_date.dbValues[ 0 ];
    } ).reverse();

    var otherUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[0] !== userName;
    } );

    otherUserList = _.sortBy( otherUserList,  function( rDef ) {
    return rDef.props.rd_name.dbValues[ 0 ];
    } );
    var finalList = owningUserList.concat( otherUserList );
    reportDefinitions = finalList;

    var reportFilter = appCtxService.getCtx( 'awp0SummaryReports.reportFilter' );

    if( reportFilter !== undefined && reportFilter !== null && reportFilter !== '*' && reportFilter !== '' ) {
        reportDefinitions = reportDefinitions.filter( function( rdef ) {
            return rdef.props.rd_name.uiValues[ 0 ].toLowerCase().indexOf( reportFilter.toLowerCase() ) >= 0;
        } );
    }

    reportCommnSrvc.setupReportPersistCtx();
    appCtxService.updatePartialCtx( 'search.totalFound', reportDefinitions.length );

    return {
        reportdefinitions: reportDefinitions
    };
};

export let performReportFiltering = function( stringFilter ) {
    appCtxService.updatePartialCtx( 'awp0SummaryReports.reportFilter', stringFilter );
    eventBus.publish( 'primaryWorkarea.reset' );
};

export let raiseEventToPerformFiltering = function( filterStr ) {
    eventBus.publish( 'reportDefBreadCrumb.filterReports', {
        scope: {
            filterString: filterStr
        }
    } );
};

export let displaySummaryCustomReportPanel = function( ctx ) {
    if( ctx.activeToolsAndInfoCommand === undefined ) {
        cmdPanelSrvc.activateCommandPanel( 'Awp0ReportsSummary', 'aw_toolsAndInfo' );
    }
};

/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 */
export let loadColumns = function( dataprovider ) {
    dataprovider.columnConfig = {
        columns: [ {
            name: 'icon',
            displayName: 'ReportDefinition',
            width: 40,
            enableColumnMoving: false,
            enableColumnResizing: false,
            enableFiltering: false,
            pinnedLeft: true,
            typeName: 'ReportDefinition'
        }, {
            name: 'rd_name',
            displayName: 'Name',
            typeName: 'ReportDefinition',
            width: 300
        }, {
            name: 'rd_id',
            displayName: 'Id',
            typeName: 'ReportDefinition',
            width: 300
        }, {
            name: 'rd_description',
            displayName: 'Description',
            typeName: 'ReportDefinition',
            width: 300
        } ]
    };
};

/**
 * showReportBuilderReportsService factory
 *
 */

export default exports = {
    getReportDefinitionVal,
    performReportFiltering,
    raiseEventToPerformFiltering,
    loadColumns,
    displaySummaryCustomReportPanel
};
app.factory( 'showReportBuilderReportsService', () => exports );
