// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Arm0RequirementSummaryTable
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import reqUtils from 'js/requirementsUtils';
import reqACEUtils from 'js/requirementsACEUtils';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import markupViewModel from 'js/Arm0MarkupViewModel';
import markupUtil from 'js/Arm0MarkupUtil';
import $ from 'jquery';

var exports = {};
var _data = null;

export let getColumnFilters = function( data ) {
    return data.columnProviders.reqSummaryTableColumnProvider.columnFilters;
};

export let clearProviderSelection = function( data ) {
    if ( data && data.dataProviders ) {
        var dataProvider = data.dataProviders.showReqSummaryTableProvider;
        if ( dataProvider ) {
            dataProvider.selectNone();
        }
    }
};
/**
 * Refresh linked objects post tracelink creation
 * @param {object} data view model
 * @param {object} ctx context
 */
export let postTracelinkCreated = function( data, ctx ) {
    var eventData = data.eventData;
    if ( !eventData.startItems || !eventData.endItems ) {
        return;
    }
    if ( eventData.startItems.length <= 0 || eventData.endItems.length <= 0  ) {
        return;
    }

    var arrModelObjs = [];

    for ( var i = 0; i < eventData.startItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.startItems[ i ].uid ) );
    }
    for ( i = 0; i < eventData.endItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.endItems[ i ].uid ) );
    }

    if( arrModelObjs.length > 0 ) {
        soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: arrModelObjs
        } );
        exports.refreshTableData( data, ctx );
    }
};

/** 
 * Retrives the saved working context uid
 * 
 * @returns {object}  savedWorkingContext  savedWorking Context
 */
export let getWorkingContextUid = function() {
    let savedWorkingContextUid = null;
    let occmgmtContext = appCtxSvc.getCtx( 'occmgmtContext' );
    if( occmgmtContext && occmgmtContext.workingContextObj ) {
        savedWorkingContextUid = occmgmtContext.workingContextObj.uid;
    }
    return savedWorkingContextUid;
};

/**
 * load the updated table properties
 *
 */
export let updateTableContent = function() {
    eventBus.publish( 'Arm0RequirementSummaryTable.refreshDataInTable' );
};

/**
 * load the updated table properties
 *
 * @param {Object} data - The panel's view model object
 * @param {object} ctx context
 */
export let refreshTableData = function( data, ctx ) {
    var swaCtx = ctx.xrtPageContext;
    if( swaCtx && swaCtx.secondaryXrtPageID === 'tc_xrt_summary_table' ) {
        var bookmarkUid = exports.getWorkingContextUid();
        var inputData2 = { columnConfigInput: {
            clientName: 'AWClient',
            operationType: 'as_arranged',
            clientScopeURI: 'ReqSummaryTable'
        },
        saveColumnConfigData: {
            clientScopeURI: 'ReqSummaryTable',
            columnConfigId: data.dataProviders.showReqSummaryTableProvider.columnConfig.columnConfigId,
            columns: data.dataProviders.showReqSummaryTableProvider.newColumns,
            scope: 'LoginUser',
            scopeName: ''
        },
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Arm0SummaryTabProvider',
            searchCriteria: {
                selectedElementUid: ctx.pselected.uid,
                productContextUid: ctx.occmgmtContext.productContextInfo.uid,
                bookmarkUid: bookmarkUid,
                enableSortAndPaging: 'true'
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchSortCriteria: data.columnProviders.reqSummaryTableColumnProvider.sortCriteria,
            startIndex: data.dataProviders.showReqSummaryTableProvider.startIndex,
            columnFilters: data.columnProviders.reqSummaryTableColumnProvider.columnFilters
        },
        inflateProperties: true };
        soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData2 );
    }
};

/**
 * load the mathjax and fonts data
 *
 * @param {Object} data - The panel's view model object
 */
export let loadEquationFonts = function( data ) {
    reqUtils.loadEquationFonts( document );
};

/**
 * Set the underlying source object from the proxy object
 *
 * @param {Object} data - The panel's view model object
 * @param {object} ctx context
 */
export let setSourceObjectAsSelected = function( data, ctx ) {
    if( ctx.selected.type === 'Arm0SummaryTableProxy' && ctx.selected.props.arm0SourceElement ) {
        var objectUid = ctx.selected.props.arm0SourceElement.dbValues[0];
        var obj =  cdm.getObject( objectUid );
        appCtxSvc.registerCtx( 'selected', obj );
        appCtxSvc.registerCtx( 'mselected', [ obj ] );

        if( obj.props.awb0UnderlyingObject ) {
            var modelObject = cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[0] );
            var cellProp = [ 'awp0CellProperties' ];
            var arrModelObjs = [ modelObject ];
            reqUtils.loadModelObjects( arrModelObjs, cellProp );
        }

        var requirementCtx = appCtxSvc.getCtx( 'requirementCtx' );
        var reqCtx = appCtxSvc.getCtx( 'requirements' );
        var noChange = false;
        if( reqCtx && reqCtx.selectedObjects && reqCtx.selectedObjects.length > 0 ) {
            noChange = reqCtx.selectedObjects[0].uid === obj.uid;
        }
        if( !noChange && requirementCtx && requirementCtx.splitPanelLocation && requirementCtx.splitPanelLocation === 'bottom' ) {
            var syncTableEventData = {
                selectedParents : [ obj ]
            };
            eventBus.publish( 'uniformParamTable.applySync', syncTableEventData );
        }
    }
};

/**
 * To get selected item Object details
 * @param {Object} data - view model data
 */
export let getSelectedRefObj = function( data ) {
    data.selectedRefObj = appCtxSvc.getCtx( 'summaryTableSelectedObjUid' );
};

/**
 * Get Input data for getSpecificationSegment.
 *
 * @param {Object} data - The panel's view model object
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInput = function( data ) {
    var inputCtxt = reqACEUtils.getInputContext();
    data.selectedRefObj = appCtxSvc.getCtx( 'summaryTableSelectedObjUid' );
    return {
        inputCtxt: inputCtxt,
        inputObjects: [ data.selectedRefObj.modelRevObject ],
        options: [ 'ExportContent' ]
    };
};

/**
 * Retrieve comments from getSpecificationSegment output
 *
 * @param {Object} data - The panel's view model object
 */
export let getCommentsAfterDataLoad = function( data ) {
    if( data.content && data.content.markUpData && data.content.markUpData.length > 0 ) {
        var markups = JSON.parse( data.content.markUpData[0].markups );
        var markupJson = [];

        for ( let index = 0; index < markups.length; index++ ) {
            const element = markups[index];
            if( !element.attributes ) {
                markupJson.push( element );
            }
        }
        if( markupJson.length > 0 ) {
            var comments = JSON.stringify( markupJson );
            markupViewModel.setMarkupsForSummaryTab( comments );
            appCtxSvc.unRegisterCtx( 'reqMarkupCtx' );
            appCtxSvc.unRegisterCtx( 'markup' );
            markupUtil.setMarkupContext( data );
            _data = data;
            commandPanelService.activateCommandPanel( 'Arm0MarkupMain', 'aw_toolsAndInfo', null, true );
        }
    }
};

var _getCreateMarkupInput = function( data ) {
    return markupUtil.getCreateMarkupInput( data.content );
};

/**
 * getInputValues for SOA call
 * @param {Object} data - data Object
 * @return {Object} created input for SOA call
 */
export let getInputValues = function( data ) {
    var markUpInput = [];
    var prodCtxt = occMgmtStateHandler.getProductContextInfo();
    var requestPref = {};

    markupUtil.updateMarkupContext();
    var selectedUid = _data.selectedRefObj.uid;
    var selected =  cdm.getObject( selectedUid );
    markUpInput = _getCreateMarkupInput( _data );

    appCtxSvc.unRegisterCtx( 'reqMarkupCtx' );

    var baseURL = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
    requestPref.base_url = baseURL;
    var occConfigInfo = reqACEUtils.prepareOccConfigInfo( prodCtxt, false );
    var inputContext = reqACEUtils.prepareInputContext( occConfigInfo, 1, null, prodCtxt, requestPref );
    return {
        inputCtxt: inputContext,
        createInput: [],
        setContentInput: [],
        markUpInput: markUpInput,
        selectedElement: { uid: selected.uid, type: selected.type }
    };
};

/**
 * Save Markups to Server.
 *
 * @return {Promise} Promise that is resolved when save edit is complete
 */
export let saveMarkupContent = function() {
    var deferred = AwPromiseService.instance.defer();

    var createUpdateInput = exports.getInputValues();
    if( createUpdateInput ) {
        var input = {
            createUpdateInput: createUpdateInput
        };
        var promise = soaSvc.post( 'Internal-AwReqMgmtSe-2019-06-SpecNavigation', 'createOrUpdateContents', input );
        promise.then( function( response ) {
                exports.updateTableContent();
                deferred.resolve( response );
            } )
            .catch( function( error ) {
                deferred.reject( error );
            } );
    } else {
        deferred.resolve();
    }
    return deferred.promise;
};

/**
 * Set Summary Table height
 */
export let setSummaryTableHeight = function() {
    var subLocHeight = document.getElementsByClassName( 'aw-layout-sublocationContent' )[ 0 ].clientHeight;
    var requiredHeight = subLocHeight - 75;
    var element = document.getElementsByClassName( 'aw-layout-panelMain' )[ 0 ];
    if( element && ( !element.style.maxHeight || element.style.maxHeight.indexOf( requiredHeight ) === -1 ) ) {
        var panelScrollBody = $( element );
        panelScrollBody.attr( 'style', 'max-height:' + requiredHeight + 'px' );
    }
};

/**
 * Returns the Arm0RequirementSummaryTable instance
 *
 * @member Arm0RequirementSummaryTable
 */

export default exports = {
    getColumnFilters,
    clearProviderSelection,
    postTracelinkCreated,
    loadEquationFonts,
    setSourceObjectAsSelected,
    getSelectedRefObj,
    getSpecificationSegmentInput,
    getCommentsAfterDataLoad,
    refreshTableData,
    getInputValues,
    updateTableContent,
    getWorkingContextUid,
    saveMarkupContent,
    setSummaryTableHeight
};

app.factory( 'Arm0RequirementSummaryTable', () => exports );
