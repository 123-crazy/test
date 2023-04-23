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
 * @module js/Awp0InContextReportsService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import listBoxService from 'js/listBoxService';
import modelPropertySvc from 'js/modelPropertyService';
import tcSesnD from 'js/TcSessionData';
import messagingService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import reportstabpageservice from 'js/Rb0ReportsPage';
import localeSvc from 'js/localeService';
import tcVmoService from 'js/tcViewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import reportsCommSrvc from 'js/reportsCommonService';

var exports = {};

var stylesheetNametoUID = {};
var stylesheetNameToUidForTC = {};
var oldselected = null;

var _inCtxReportDefs = null;
var _tcRAReportList = [];

/**
 * Return true if platform version is 114 or above
 */
export let isPlatformVersionSupported = function() {
    var majorVersion = tcSesnD.getTCMajorVersion();
    var minorVersion = tcSesnD.getTCMinorVersion();
    var qrmNumber = tcSesnD.getTCQRMNumber();

    return majorVersion === 11 && minorVersion === 2 && qrmNumber > 5 || majorVersion >= 12;
};

export let setIsRunInBackgroundParameters = function( selectedReport, data ) {
    if( exports.isPlatformVersionSupported() && data.runReportAsync ) {
        if( selectedReport.props.fnd0IsAsync.dbValues[ 0 ] === '1' ) {
            data.runReportAsync.dbValue = true;
        } else {
            data.runReportAsync.dbValue = false;
        }
        appCtxService.updatePartialCtx( 'awp0Reports.asyncValue', selectedReport.props.fnd0IsAsync.dbValue );
        appCtxService.updatePartialCtx( 'awp0Reports.isRunReportInBackgroundSupported', true );
    } else {
        appCtxService.updatePartialCtx( 'awp0Reports.isRunReportInBackgroundSupported', false );
    }
};

/**
 * Add the subpanel to the existing panel.
 *
 * @param {String} data - The view model data
 *
 */
export let displayCriteriaPanel = function( selectedObject, data ) {
    if( data && selectedObject ) {
        if( oldselected === null ) {
            oldselected = selectedObject;
        }

        var source_Name = selectedObject.props.rd_source.displayValues[ 0 ];
        var destPanelId = 'Awp0InContextReportsTcRA';

        if( source_Name === 'Active Workspace' ) {
            return;
        } else if( source_Name !== 'TcRA' ) {
            if( selectedObject.props.rd_type.dbValues[ 0 ] === '2' ) {
                exports.createwidgetsforCustom( selectedObject, data );
            } else if( selectedObject.props.rd_type.dbValues[ 0 ] === '1' ) {
                createItemReportCriteriaPanel( selectedObject, data );
            }

            destPanelId = 'Awp0InContextReportsSub';
            exports.displayStylesheet( null, data );
            exports.getLanguageList( null, data );
        }

        exports.setIsRunInBackgroundParameters( selectedObject, data );

        //Clear our any data on the textbox
        if( data.saveToDataSet ) {
            data.saveToDataSet.dbValue = null;
        }

        //set contextChanged for the active view to reset the subsequent panels to pristine
        var activePanel = data.getSubPanel( data.activeView );
        if( activePanel ) {
            activePanel.contextChanged = true;
        }

        var context = {
            destPanelId: destPanelId,
            title: data.i18n.backButton,
            supportGoBack: true
        };

        if( oldselected.uid !== selectedObject.uid ) {
            context.recreatePanel = true;
        }

        oldselected = selectedObject;
        eventBus.publish( 'awPanel.navigate', context );
    }
};

/**
 * @param selectedObject
 * @param data
 */
function createItemReportCriteriaPanel( selectedObject, data ) {
    if( selectedObject.props.rd_parameters.dbValues !== null && selectedObject.props.rd_parameters.dbValues[ 0 ] === 'BOM_REPORT' ) {
        getRevisionRule( data );
    }

    if( data.packedbombooleanValues === undefined ) {
        data.packedbombooleanValues = listBoxService.createListModelObjectsFromStrings( [ data.i18n.trueVal, data.i18n.falseVal ] );
    }
}

/**
 * Set the stylesheets to the widget
 *
 * @param {Object} selectedSummaryObject - selectedSummaryObject
 * @param {Object} data - The qualified data of the viewModel
 */
export let displayStylesheet = function( selectedSummaryObject, data ) {
    if( data !== null ) {
        if( data.selectStyleSheet ) {
            data.selectStyleSheet.dbValue = null;
            data.selectStyleSheet.uiValue = null;
        }

        data.officestylesheets = [];
        data.stylesheetsUIDs = [];

        var officestylesheets = [];
        var selectedObject = null;

        if( !data.dataProviders ) {
            selectedObject = selectedSummaryObject;
        } else {
            selectedObject = data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ];
        }

        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Teamcenter' && selectedObject.props.rd_style_sheets.dbValues !== null ) {
            for( var i = 0; i < selectedObject.props.rd_style_sheets.dbValues.length; i++ ) {
                officestylesheets.push( selectedObject.props.rd_style_sheets.uiValues[ i ] );
                stylesheetNameToUidForTC[ selectedObject.props.rd_style_sheets.uiValues[ i ] ] = selectedObject.props.rd_style_sheets.dbValues[ i ];
            }
        } else if( source_Name === 'Office Template' ) {
            eventBus.publish( 'getStylesheets.office_templates', {
                scope: {
                    data: data
                }
            } );
        }

        if( source_Name === 'Teamcenter' ) {
            data.officestylesheets = listBoxService.createListModelObjectsFromStrings( officestylesheets );
        }
    }
};

/*
 * Fire an event to be picked by the ViewModel to initiate a SOA call @param { Object }data - The qualified data
 * of the viewModel
 */
export let getLanguageList = function( selectedSummaryObject, data ) {
    if( data ) {
        eventBus.publish( 'getLocaleInfo_temp', {
            scope: {
                data: data
            }
        } );
    }
};

/*
 * Default properties like process, output, needs to display in localized text.
 * So get their values from data as SOA props will have only values in en_US.
 */
self.getCustomReportDefaultPropName = function( propName, data ) {
    if( propName === 'process' ) {
        return data.process.propertyDisplayName;
    } else if( propName === 'output' ) {
        return data.output.propertyDisplayName;
    } else if( propName === 'Method_Name' ) {
        return data.methodName.propertyDisplayName;
    }
    return propName;
};

/*
 * process and output should be read-only properties.
 */
self.isEditable = function( propName ) {
    if( propName === 'process' || propName === 'output' || propName === '-p' ) {
        return 'false';
    }
    return 'true';
};

export let getCustomPropList = function( rd_params, rd_paramVals, data ) {
    for( var i = 0; i < rd_params.length; i++ ) {
        var propDisplayName = self.getCustomReportDefaultPropName( rd_params[ i ], data );
        var isEditable = self.isEditable( rd_params[ i ] );
        var value = propDisplayName === '-p' ? '*****' : rd_paramVals[ i ];

        var propAttrHolder = {
            displayName: propDisplayName,
            propName: rd_params[ i ],
            type: 'STRING',
            isRequired: 'false',
            isEditable: isEditable,
            isEnabled: isEditable,
            hasLov: false,
            labelPosition: isEditable === 'false' ? 'PROPERTY_LABEL_AT_SIDE' : 'PROPERTY_LABEL_AT_TOP',
            value: value,
            dbValue: value,
            uiValue: value,
            dispValue: value

        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        data.customProps.push( property );
    }
};

/**
 * Create view model properties for custom report parameters
 *
 * @param {Object} selectedReportDefinitionObject Currently selected custom report definition object
 * @param {object} data  Data
 *
 * @returns {any} promise
 *
 */
export let createwidgetsforCustom = function( selectedReportDefinitionObject, data ) {
    data.customProps = [];

    if( selectedReportDefinitionObject.props.rd_parameters && selectedReportDefinitionObject.props.rd_parameters.dbValues.length > 0 ) {
        exports.getCustomPropList( selectedReportDefinitionObject.props.rd_parameters.dbValues, selectedReportDefinitionObject.props.rd_param_values.dbValues, data );
    } else {
        var deferred = AwPromiseService.instance.defer();
        var propNames = [ 'rd_parameters', 'rd_param_values' ];
        var objs = [ selectedReportDefinitionObject ];
        tcVmoService.getViewModelProperties( objs, propNames ).then( function() {
            exports.getCustomPropList( objs[ 0 ].props.rd_parameters.dbValues, objs[ 0 ].props.rd_param_values.dbValues, data );
            deferred.resolve( objs );
        } );
        return deferred.promise;
    }
};

/**
 * @param data
 */
function getRevisionRule( data ) {
    if( data ) {
        eventBus.publish( 'getRevisionRule_temp', {
            scope: {
                data: data
            }
        } );
    }
}

export let getRevRuleLovListFromLovValues = ( responseData ) => {
    var revRuleLovList = [];
    if( responseData && responseData.lovValues && responseData.lovValues.length > 0 ) {
        responseData.lovValues.map( ( revRuleObj ) => {
            if( revRuleObj.propDisplayValues && revRuleObj.propDisplayValues.object_name ) {
                var revRuleVMObj = {
                    propDisplayValue: revRuleObj.propDisplayValues.object_name[0],
                    propInternalValue: revRuleObj.uid,
                    dbValue: revRuleObj.uid,
                    uid:  revRuleObj.uid
                };
                revRuleLovList.push( revRuleVMObj );
            }
        } );
    }
    return revRuleLovList;
};

/*
 * Extracts report file extension, it will be used to decide to shown report in Tab or download. @param response
 * {Object} the response from the generateReport SOA @return {string} the extension of Report file.
 */
export let getTicketExtension = function( response ) {
    var extension;
    if( response && response.asyncFlagInfo === false && response.transientFileTicketInfos &&
        response.transientFileTicketInfos.length > 0 ) {
        var ticket = response.transientFileTicketInfos[ 0 ].ticket;
        extension = ticket.substr( ticket.lastIndexOf( '.' ) + 1 );
        eventBus.publish( 'reportbuilder.generateitemreportcomplete', {
            reportInfo: {
                fileTicket: response.transientFileTicketInfos[ 0 ].ticket,
                reportFileName: response.transientFileTicketInfos[ 0 ].transientFileInfo.fileName
            }
        } );
    }

    return extension;
};

/**
 * Processing logic which will check if any TcRA report exist. Analytics tab visibility will be set accordingly.
 * Also maintains array which holds ReportDefs for TC and TcRA reports seperately.
 * @param {*} response - SOA response to be processes.
 */
export let processResponseToStoreReportDefs = function( response ) {
    _inCtxReportDefs = null;
    _tcRAReportList = [];

    appCtxService.updatePartialCtx( 'awp0Reports.startLoadingReportsList', false );

    _inCtxReportDefs = response.reportdefinitions.map( function( rDef ) {
        var repDefObj = response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
        if( repDefObj.type === 'ReportDefinition' && ( repDefObj.props.rd_source.dbValues[ 0 ] === 'Teamcenter' ||
                repDefObj.props.rd_source.dbValues[ 0 ] === 'Office Template' ||  repDefObj.props.rd_source.dbValues[ 0 ] === 'Active Workspace' ) ) {
            return rDef;
        } else if( repDefObj.type === 'ReportDefinition' && repDefObj.props.rd_source.dbValues[ 0 ] === 'TcRA' ) {
            _tcRAReportList.push( rDef );
        }
    } );

    //TODO find better way..
    _inCtxReportDefs = _inCtxReportDefs.filter( function( validRepDef ) {
        return validRepDef !== undefined;
    } );

    if( _tcRAReportList.length > 0 ) {
        appCtxService.updatePartialCtx( 'awp0Reports.tcRAReportsAvailable', true );
    } else {
        appCtxService.updatePartialCtx( 'awp0Reports.tcRAReportsAvailable', false );
    }

    if( _inCtxReportDefs.length > 0 ) {
        appCtxService.updatePartialCtx( 'awp0Reports.tcReportsAvailable', true );
    } else {
        appCtxService.updatePartialCtx( 'awp0Reports.tcReportsAvailable', false );
    }
};

/**
 * Get Teamcenter InContext ReportDefinition's
 */
export let getTCInContextReportDefs = function() {
    _inCtxReportDefs.sort((data1, data2) => {
        return data1.reportdefinition.props.rd_name.dbValues[0].localeCompare(data2.reportdefinition.props.rd_name.dbValues[0]);
    });
    return _inCtxReportDefs;
};

/**
 * Get TcRA InContext ReportDefinition's
 */
export let getTCRAReportDefs = function() {
    return _tcRAReportList;
};

/**
 *Flag to set on ctx which will enable tab sets.
 */
export let loadListViewModel = function() {
    appCtxService.updatePartialCtx( 'awp0Reports.startLoadingReportsList', true );
};

/**
 * Clean ctx and remove all of awp0Reports.
 */
export let cleanctxonpanelclose = function() {
    appCtxService.unRegisterCtx( 'awp0Reports' );
};

/*
 * Get the language list @param { Object } response - SOA response @return { ObjectArray } - List of objects for
 * listbox
 */
export let prepareLanguageList = function( response ) {
    if( response.languageList ) {
        var languageList = [];
        //Get user locale
        var currentLocaleCode = localeSvc.getLocale(); //this returns value in en-US format

        //Set User Language as first entry in the list
        for( var ii = 0; ii < response.languageList.length; ii++ ) {
            if( currentLocaleCode === response.languageList[ ii ].languageCode ) {
                languageList.push( response.languageList[ ii ] );
                break;
            }
        }

        var reportLocale = appCtxService.ctx.preferences.Report_Generate_Display_Locale_List;
        if( reportLocale !== undefined ) {
           for( var jj = 0; jj < reportLocale.length; jj++ ) {
               var value = reportLocale[jj];
               for( var k = 0; k < response.languageList.length; k++ ) {
               if( response.languageList[k].languageCode === value && response.languageList[k].languageCode !== currentLocaleCode ) {
                   languageList.push( response.languageList[ k ] );
               }
            }
           }
           if( languageList.length <= 1 ) {
            for( var i = 0; i < response.languageList.length; i++ ) {
                if( response.languageList[ i ].languageCode !== currentLocaleCode ) {
                    languageList.push( response.languageList[ i ] );
                }
            }
           }
        } else{
        //Now add other languages except user language.
        for( var i = 0; i < response.languageList.length; i++ ) {
            if( response.languageList[ i ].languageCode !== currentLocaleCode ) {
                languageList.push( response.languageList[ i ] );
            }
        }
    }
        return listBoxService.createListModelObjects( languageList, 'languageName' );
    }
};

/*
 * Retrieves the list of OfficeStyleSheets from the SOA Also, create a map to fetch the UID from the
 * DisplayValue @param { Object }response - Response of the SOA
 */
export let getOfficeStyleSheets = function( response ) {
    var stylesheetDisplayName = [];
    if( response.ServiceData.modelObjects ) {
        _.forEach( response.ServiceData.modelObjects, function( mdlObject ) {
            if( mdlObject.type !== 'User' && mdlObject.props && mdlObject.props.object_name && !mdlObject.type.endsWith( 'Revision' ) &&  !stylesheetDisplayName.includes( mdlObject.props.object_name.dbValues[0] ) ) {
                stylesheetDisplayName.push( mdlObject.props.object_name.dbValues[ 0 ] );
                stylesheetNametoUID[ mdlObject.uid ] = mdlObject;
            }
        } );
        return listBoxService.createListModelObjectsFromStrings( stylesheetDisplayName );
    }
};

/**
 * Input for getreportdefinition SOA.
 */
export let getreportdefinitionsoainput = function( data, ctxObj ) {
    var inputCriteriaList = [];
    var sourcelist = [];
    sourcelist.push( 'Teamcenter' );
    sourcelist.push( 'TcRA' );
    sourcelist.push( 'Office Template' );

    var ctxObjs = [];
    ctxObj.forEach( element => {
        var underlyingCtx = reportsCommSrvc.getUnderlyingObject( element );
        ctxObjs.push( underlyingCtx );
    } );
    data.selectedObjects = ctxObjs;

    for( var i = 0; i < sourcelist.length; i++ ) {
        inputCriteriaList.push( {
            category: 'ItemReports',
            source: sourcelist[ i ],
            contextObjects: ctxObjs
        } );
    }

    inputCriteriaList.push( {
        category: '',
        source: 'Active Workspace',
        contextObjects: ctxObjs
    } );

    //Add Custom report Input filter only If TC version is greater than TC114.
    //Minimum TC support version in 12.1, will need to remove version check in future releases.
    //Update it for TC13 currently.
    var sessionDataCtx = appCtxService.getCtx( 'tcSessionData' );
    if( sessionDataCtx.tcMajorVersion === 11 && sessionDataCtx.tcMinorVersion === 2 && sessionDataCtx.tcQRMNumber > 4 || sessionDataCtx.tcMajorVersion >= 12 ) {
        for( var j = 0; j < sourcelist.length; j++ ) {
            inputCriteriaList.push( {
                category: 'CustomReports',
                source: sourcelist[ j ],
                contextObjects: ctxObjs
            } );
        }
    }
    return inputCriteriaList;
};

/**
 * Retrieve the UID from DisplayValues
 *
 * @param {Object} styleSheetName - Selected stylesheet displayValue
 * @param {Object} data - The qualified data of the viewModel
 */
export let getStylesheetTag = function( styleSheetName, data ) {
    if( data !== null ) {
        var selectedObject = null;
        if( !data.dataProviders ) {
            selectedObject = data.selectedReportDef;
        } else {
            selectedObject = data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ];
        }
        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];

        if( source_Name === 'Teamcenter' ) {
            return {
                uid: stylesheetNameToUidForTC[ styleSheetName ],
                type: 'CrfHtmlStylesheet'
            };
        } else if( source_Name === 'Office Template' ) {
            for( var key in stylesheetNametoUID ) {
                if( stylesheetNametoUID[ key ].props.object_name.uiValues[ 0 ] === styleSheetName ) {
                    return {
                        uid: key,
                        type: stylesheetNametoUID[ key ].type
                    };
                }
            }
        }
    }
};

/**
 * Get the context keys of source and target topline objects from split view.
 *
 */
export let getContextKeys = function() {
    var _contextKeys = {
        leftCtxKey: null,
        rightCtxKey: null
    };
    var _multipleContext = appCtxService.getCtx( 'ace.multiStructure' );
    if( _multipleContext ) {
        _contextKeys.leftCtxKey = _multipleContext.leftCtxKey;
        _contextKeys.rightCtxKey = _multipleContext.rightCtxKey;
    } else {
        _multipleContext = appCtxService.getCtx( 'splitView' );
        if( _multipleContext ) {
            _contextKeys.leftCtxKey = _multipleContext.viewKeys[ 0 ];
            _contextKeys.rightCtxKey = _multipleContext.viewKeys[ 1 ];
        }
    }
    return _contextKeys;
};

/**
 * Retrieve topline objects from split view or selected objects if not in split view.
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - Context parameter
 */
export let getSelectedObjects = function( data, ctx ) {
    var selObjects;
    if( ctx.splitView && ctx.splitView.mode === true ) {
        var contextKeys = getContextKeys();
        var topSrcElement = appCtxService.getCtx( contextKeys.leftCtxKey + '.topElement' );
        var srcObj;
        if( topSrcElement.props.awb0UnderlyingObject !== undefined ) {
            srcObj = cdm.getObject( topSrcElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
        var topTrgElement = appCtxService.getCtx( contextKeys.rightCtxKey + '.topElement' );
        var trgObj;
        if( topTrgElement.props.awb0UnderlyingObject !== undefined ) {
            trgObj = cdm.getObject( topTrgElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
        selObjects = [ srcObj, trgObj ];
    } else{
        selObjects =  data.selectedObjects;
    }

    return selObjects;
};

/**
 * In ACE sub-location navigates user from currently selected tab to the Reports tab.
 */
self.navigateToReportsTab = function( reportsTab ) {
    var tabContainer = $( 'div.aw-xrt-tabsContainer' );
    var tabContainerScope = ngModule.element( tabContainer ).scope();
    tabContainerScope.$broadcast( 'NgTabSelectionUpdate', reportsTab );
};

/**
 * Object will be opened and Reports tab will be highlighted to display HTML report
 */
self.openObjectAndShowReport = function( $state, ctxObj, reportsPage ) {
    var toParams = {};
    var options = {};
    var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';

    toParams.page = reportsPage;
    toParams.pageId = 'tc_xrt_Rb0Reports';

    toParams.uid = ctxObj.uid;
    toParams.edit = 'false';
    options.inherit = false;
    $state.go( showObject, toParams, options );
};

/**
 * Will update displayed HTML Report.
 */
self.updateDisplayedReport = function( ctxObj, fileTicket ) {
    eventBus.publish( 'updateHTMLReport', {
        scope: {
            selected: ctxObj,
            urlPath: fileTicket
        }
    } );
};
self.isShowObjectLocation = function() {
    var isShowObject = false;
    var locationCtx = appCtxService.getCtx( 'locationContext' );
    if( locationCtx && ( locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ||
            locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.clientfx.tcui.xrt.objectNavigationSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ||
            locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.schmgt:ScheduleNavigationSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ||
            locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.prgplanning:PlanNavigationSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) ) {
        //show object location, but occ management sublocation, where tabs are available instead of Pages.
        isShowObject = false;
    } else if( locationCtx && locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) {
        isShowObject = true;
    }
    return isShowObject;
};

/**
 * Performs JQuery and returns the ReportTab Object.
 *
 * It will need a refactor based on object selection PWA or showObject.
 */
self.getReportsTabScope = function( reportsPage, data ) {
    var tabBar = $( 'div.aw-jswidget-tabBar' );
    var reportsTab = null;
    if( tabBar[ 1 ] && !self.isShowObjectLocation() ) {
        var tabBarContent = tabBar[ 1 ].childNodes[ 1 ];
        var tabBarContentScope = ngModule.element( tabBarContent ).scope();

        _.forEach( tabBarContentScope.tabsModel, function( tab ) {
            if( tab.name === reportsPage && tab.tabKey === 'tc_xrt_Rb0Reports' ) {
                reportsTab = tab;
            }
        } );

        if( !reportsTab ) {
            data.isTabAvailable = false;
        }
    } else if( tabBar[ 0 ] && self.isShowObjectLocation() ) {
        tabBarContent = tabBar[ 0 ].childNodes[ 1 ];
        tabBarContentScope = ngModule.element( tabBarContent ).scope();

        _.forEach( tabBarContentScope.tabsModel, function( tab ) {
            if( tab.name === reportsPage && tab.tabKey === 'tc_xrt_Rb0Reports' ) {
                data.isTabAvailable = true;
            }
        } );
    }
    return reportsTab;
};

var setupExecutingReportOnCtx = function( data ) {
    if( data.dataProviders && data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValue === 1 &&
        data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_source.dbValue === 'Active Workspace' ) {
        appCtxService.updatePartialCtx( 'selectedReportDefinition', data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ] );
        reportsCommSrvc.setupReportPersistCtx();
    } else {
        var repOnCtx = appCtxService.getCtx( 'selectedReportDefinition' );
        if( repOnCtx ) {
            appCtxService.unRegisterCtx( 'selectedReportDefinition' );
        }
    }
};

/**
 * Open and Display HTML report in the Reports tab. Depending on object type, actions will be performed.
 * ReportDefinition: It will be shown in sub-location ItemRevision and such BO: Open and show in sub-location.
 *
 * @param {Object} selectedObj - currently selected object
 * @param {Object} fileTicket - FMS file ticket returned by server for the HTML Report
 * @param {Object} data - Data
 * @param {Object} occCtx - Occurrence management context
 */
export let openFileInNewTab = function( selected, fileTicket, data ) {
    var ctxObj = reportsCommSrvc.getUnderlyingObject( selected );

    if( ctxObj && ctxObj.uid ) {
        setupExecutingReportOnCtx( data );

        //Set selected object and its associated file ticket parameters
        reportstabpageservice.setReportsParameter( ctxObj, fileTicket );

        var $state = AwStateService.instance;
        var pageName = $state.params.page;
        var reportsTab = self.getReportsTabScope( data.i18n.reportsPage, data );
        var ctx = appCtxService.ctx;

        if( !( ctx.splitView && ctx.splitView.mode === true ) && (
            reportsTab || pageName === data.i18n.reportsPage ) )  {
            if( reportsTab && reportsTab.selectedTab === true || pageName === data.i18n.reportsPage ) {
                self.updateDisplayedReport( ctxObj, fileTicket );
            } else {
                self.navigateToReportsTab( reportsTab );
            }
        } else if( data.isTabAvailable === false || data.isTabAvailable === undefined ) {
            if( data.dataProviders && data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValue === 1 &&
                data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_source.dbValue === 'Active Workspace' ) {
                    //message when Reports tab is not available to display Active item report.
                    messagingService.reportNotyMessage( data, data._internal.messages, 'awReportNotDisplayedMsg' );
            } else {
                fmsUtils.openFile( fileTicket );
            }
        } else {
            self.openObjectAndShowReport( $state, ctxObj, data.i18n.reportsPage );
        }
    }
};

export let processAsyncReport = function( data ) {
    //if it is async report, check and show message
    //further processing not required...
    if( data.m_async ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'showAsyncReportMessage' );
        return;
    }
};

export let getPasswordValue = function( selectedReport ) {
    for( var i = 0; i < selectedReport.props.rd_parameters.dbValues.length; i++ ) {
        if( selectedReport.props.rd_parameters.dbValues[ i ] === '-p' ) {
            return selectedReport.props.rd_param_values.dbValues[ i ];
        }
    }
};

export let getCriteriaNames = function( data ) {
    var criteriaNames = [];
    var criteriaValues = [];
    if( data !== null ) {
        if( data.dataProviders === null && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '0' ) {
            getSummaryReportCriteria( data, criteriaNames, criteriaValues );
        } else if( data.dataProviders === null && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '2' ||
            data.dataProviders !== null && data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValues[ 0 ] === '2' ) {
            for( var i = 0; i < data.customProps.length; i++ ) {
                criteriaNames.push( data.customProps[ i ].propertyName );
                if( data.customProps[ i ].propertyName === '-p' ) {
                    criteriaValues.push( exports.getPasswordValue( data.selectedReportDef ) );
                } else {
                    criteriaValues.push( data.customProps[ i ].dbValue );
                }
            }
        } else if( data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValues[ 0 ] === '1' ) {
            getItemReportCriteria( data, criteriaNames, criteriaValues );
        }
        data.criteriaNames = criteriaNames;
        data.criteriaValues = criteriaValues;
    }
    return criteriaNames;
};

/**
 * @param data
 * @param criteriaNames
 * @param criteriaValues
 */
function getItemReportCriteria( data, criteriaNames, criteriaValues ) {
    var selectedObject = data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ];
    if( selectedObject.props.rd_parameters.dbValues !== null &&
        selectedObject.props.rd_parameters.dbValues[ 0 ] === 'BOM_REPORT' ) {
        criteriaNames.push( 'BOM_REPORT' );
        criteriaValues.push( 'TRUE' );

        criteriaNames.push( 'REV_RULE' );
        criteriaValues.push( data.revRuleProp.uiValue );

        criteriaNames.push( 'PACKED_BOM' );
        if( data.packedbom.dbValue === data.i18n.trueVal ) {
            criteriaValues.push( 'TRUE' );
        } else if( data.packedbom.dbValue === data.i18n.falseVal ) {
            criteriaValues.push( 'FALSE' );
        }
    }
}

/**
 * @param Multiple values for property LOV need to be processed and formatted.
 * @param curntUiValue - Current UI value
 */
var getCriteriaValuesLocal = function( curntUiValue ) {
    return curntUiValue.join( ';' );
};

/**
 * @param data
 * @param criteriaNames
 * @param criteriaValues
 */
function getSummaryReportCriteria( data, criteriaNames, criteriaValues ) {
    _.forEach( data.clausesfiltersList, function( prop ) {
        if( prop.uiValue !== '' ) {
            criteriaNames.push( prop.propertyDisplayName );
            if( prop.hasLov ) {
                criteriaValues.push( getCriteriaValuesLocal( prop.dbValue === undefined ? prop.dbValues : prop.dbValue ) );
            } else {
                criteriaValues.push( prop.uiValue );
            }
        }
    } );
}

export let evaluateCriteriaAndCallGenerateReport = function( data ) {
    var isCriteriaEntered = false;
    if( data !== null ) {
        if( data.dataProviders === null && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '0' ) {
            _.forEach( data.clausesfiltersList, function( prop ) {
                if( prop.uiValue !== '' ) {
                    isCriteriaEntered = true;
                }
            } );
        } else if( data.dataProviders === null && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '2' &&
            data.customProps.length > 0 ) {
            isCriteriaEntered = true;
        }

        if( isCriteriaEntered ) {
            eventBus.publish( 'executeGenerateReport', {
                scope: {
                    data: data
                }
            } );
        } else {
            messagingService.reportNotyMessage( data, data._internal.messages, 'showNoCriteriaMessage' );
        }
    }
};

export let getCriteriaValues = function( data ) {
    return data.criteriaValues;
};

export let convertDisplayLocaleValuetoString = function( propDbValue ) {
    if( propDbValue === true ) {
        return 'true';
    }
    return 'false';
};

export let getReportOptionNames = function( data ) {
    var reportOptionNames = [];
    var reportOptionValues = [];

    if( data !== null ) {
        var selectedObject = null;
        if( !data.dataProviders ) {
            selectedObject = data.selectedReportDef;
        } else {
            selectedObject = data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ];
        }

        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Office Template' ) {
            reportOptionNames.push( 'officeLive' );
            reportOptionValues
                .push( exports.convertDisplayLocaleValuetoString( data.doLiveIntegration.dbValue ) );
        }
        if( source_Name === 'Teamcenter' ) {
            reportOptionNames.push( 'report_locale' );
            reportOptionValues.push( data.displayLocale.dbValue.languageCode );
        }

        if( exports.isPlatformVersionSupported() && data.runReportAsync !== undefined && data.runReportAsync ) {
            reportOptionNames.push( 'runAsync' );
            reportOptionValues.push( exports.convertDisplayLocaleValuetoString( data.runReportAsync.dbValue ) );

            appCtxService.unRegisterCtx( 'awp0Reports.asyncValue' );
        }

        data.reportOptionNames = reportOptionNames;
        data.reportOptionValues = reportOptionValues;
    }
    return reportOptionNames;
};

export let getReportOptionValues = function( data ) {
    return data.reportOptionValues;
};

export default exports = {
    isPlatformVersionSupported,
    setIsRunInBackgroundParameters,
    displayCriteriaPanel,
    displayStylesheet,
    getLanguageList,
    getCustomPropList,
    createwidgetsforCustom,
    getTicketExtension,
    processResponseToStoreReportDefs,
    getTCInContextReportDefs,
    getTCRAReportDefs,
    loadListViewModel,
    cleanctxonpanelclose,
    prepareLanguageList,
    getOfficeStyleSheets,
    getreportdefinitionsoainput,
    getStylesheetTag,
    openFileInNewTab,
    processAsyncReport,
    getPasswordValue,
    getCriteriaNames,
    evaluateCriteriaAndCallGenerateReport,
    getCriteriaValues,
    convertDisplayLocaleValuetoString,
    getReportOptionNames,
    getReportOptionValues,
    getSelectedObjects,
    getContextKeys,
    getRevRuleLovListFromLovValues
};
/**
 * Reports panel service utility
 *
 * @memberof NgServices
 * @member reportsPanelService
 */
app.factory( 'reportsPanelService', () => exports );
