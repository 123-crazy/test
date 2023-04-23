// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Rb0ReportsPage
 */
import app from 'app';
import AwHttpService from 'js/awHttpService';
import $ from 'jquery';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import reportsCommSrvc from 'js/reportsCommonService';

var exports = {};

/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/?ticket=';

var _file = null;
var _lastSelectedBOUid = null;

export let setReportsParameter = function( vmo, ticketURL ) {
    _lastSelectedBOUid = vmo.uid;
    _file = ticketURL;
};

var getFrameSize = function() {
    var body = $( 'body' );
    var pageHeight = body.height() * 0.68;
    var pageWidth = '100%';
    return {
        height: pageHeight,
        width: pageWidth
    };
};

var checkIsOldTcRelease = function() {
    var $state = AwStateService.instance;
    if( $state.params.swa_tab ) {
        _file = $state.params.swa_tab;
        _lastSelectedBOUid = $state.params.uid;
        return true;
    }
    return false;
};

var buildTicketURL = function() {
    //update ticket..
    return CLIENT_FMS_DOWNLOAD_PATH + _file;
};

/**
 * Put HTML ticket data into iframe.
 */
self.processResponse = function( response, data ) {
    var iFrameData = null;
    if( response && response.data.length > 2 ) {
        iFrameData = response.data;
    } else {
        iFrameData = data.i18n.showNoDataFoundMessage;
    }

    var iframe = $( 'iframe.aw-reports-frameSize.ng-scope' );
    var iframedoc;
    if( iframe && iframe[ 0 ].contentDocument ) {
        iframedoc = iframe[ 0 ].contentDocument;
    } else if( iframe && iframe[ 0 ].contentWindow ) {
        iframedoc = iframe[ 0 ].contentWindow.document;
    }
    if( iframedoc ) {
        // Put the content in the iframe
        iframedoc.open();
        var iframedocContent = iFrameData;
        iframedoc.writeln( iframedocContent );
        iframedoc.close();
    }
};

/**
 *
 * @param {*} data -
 * @param {*} selected -
 * @returns {boolean} true
 */
var isItAwSourceReport = function( data, selected ) {
    var itIsAWReport = false;
    var reportObjOnCtx = appCtxService.getCtx( 'selectedReportDefinition' );

    if( reportObjOnCtx && reportObjOnCtx.props.rd_source.dbValues[ 0 ] === 'Active Workspace' && reportObjOnCtx.props.rd_type.dbValues[ 0 ] === '1'
    && selected.type ===  reportObjOnCtx.props.rd_class.dbValues[ 0 ] ) {
        itIsAWReport = true;
        if( data ) {
            data.selectedReport = reportObjOnCtx;
        }
    }
    return itIsAWReport;
};

var checkForDashboardConfigCommand = function( selectedReport, selectedObject ) {
    if( selectedReport && selectedObject ) {
        var reportNameKey = selectedReport.props.rd_id.dbValues[0] + selectedObject.uid;
        var reportList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
        if( reportList.indexOf( reportNameKey ) === -1 ) {
            appCtxService.updatePartialCtx( 'showAddToDashboardCommand', true );
        }
    }
};

export let validateReveal = function( data, selected ) {
    var ctxSelected = reportsCommSrvc.getUnderlyingObject( selected );
    var showDefaultMessage = false;
    if( isItAwSourceReport( data, ctxSelected ) && _lastSelectedBOUid && ctxSelected.uid === _lastSelectedBOUid ) {
        data.showAwReport = true;
        checkForDashboardConfigCommand( data.selectedReport, ctxSelected );
    } else if( checkIsOldTcRelease() || _lastSelectedBOUid && ctxSelected.uid === _lastSelectedBOUid ) {
        data.urlFrameSize = getFrameSize();
        var promise = AwHttpService.instance.get( buildTicketURL() );
        promise.then( function( response ) {
            self.processResponse( response, data );
        } );
    } else if( selected.type !== 'ReportDefinition' ) {
        showDefaultMessage = true;
    }
    return showDefaultMessage;
};

export let refreshPanelData = function( vmo, ticketURL ) {
    _lastSelectedBOUid = vmo.uid;
    _file = ticketURL;

    var selectRep = {};
    if( isItAwSourceReport( selectRep, vmo ) ) {
        eventBus.publish( 'updateAWSourceReport', {} );
        checkForDashboardConfigCommand( selectRep.selectedReport, vmo );
        return {
            showDefaultMessage: false
        };
    }
    eventBus.publish( 'updateTCSourceReport', {} );
    return {
        showAwReport: false,
        showDefaultMessage: false
    };
};

export let updateAWSourceReportAction = function( data ) {
    data.showAwReport = true;
    var isSelected =false;
    if(data.selectedReport) {
        isSelected =true;
    }
    var reportObjOnCtx = appCtxService.getCtx( 'selectedReportDefinition' );
    data.selectedReport = reportObjOnCtx;
    if(isSelected && data.selectedReport.props.rd_type.dbValues[0] === '1' && data.selectedReport.props.rd_source.dbValues[0] === 'Active Workspace' ) {
        eventBus.publish( 'showReportImage.refreshData', reportObjOnCtx );
    }
    return {showAwReport: data.showAwReport};
};

export let updateTCSourceReportAction = function( data ) {
    data.showAwReport = false;
     var promise = AwHttpService.instance.get( buildTicketURL() );
     promise.then( function( response ) {
         self.processResponse( response, data );
     } );
};

export default exports = {
    setReportsParameter,
    validateReveal,
    refreshPanelData,
    updateAWSourceReportAction,
    updateTCSourceReportAction
};
/**
 * Reports panel service utility
 *
 * @memberof NgServices
 * @member reportstabpageservice
 */
app.factory( 'reportstabpageservice', () => exports );
