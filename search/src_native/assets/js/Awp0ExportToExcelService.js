// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * logic surrounding exporting search results to excel
 * @module js/Awp0ExportToExcelService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import modelPropertyService from 'js/modelPropertyService';
import _ from 'lodash';


/**
 * Load the export tabs and create export selection dynamically
 * @param {Object} data - The view model data
 * @param {String} asShown - The localized string for AsShown
 * @param {string} template - The localized string for Template
 */
export let createExportPanel = function( data, asShown, template ) {
    // invalid call
    if( typeof data.exportAllSearchResults === 'undefined' ) {
        return;
    }

    var tabs = [];
    var asShownTab = {
        name: asShown,
        tabKey: 'asShown'
    };
    var templateTab = {
        name: template,
        tabKey: 'template'
    };

    var hasSelected = appCtxService.ctx.mselected.length > 0;
    var clientScopeURI = appCtxService.ctx.sublocation.clientScopeURI;
    var isInAsShownLocation = clientScopeURI === 'Awp0SearchResults' || clientScopeURI === 'Awp0AdvancedSearch';

    if( JSON.parse( isInAsShownLocation ) ) {
        tabs.push( asShownTab );
    }

    if( JSON.parse( hasSelected ) ) {
        var ctx = appCtxService.ctx;
        var is4GDObject = _.endsWith( ctx.selected.uid, 'AWB4GD' );

        var isExportTemp = ctx.selected.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1;
        var isExportToOfficeCommandVisibleAce = ctx.occmgmtContext && isExportTemp;
        var isExportToOfficeCommandVisibleNonAce = !ctx.occmgmtContext && ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'WorkspaceObject' ) > -1;
        var isShowTemplate = ( isExportToOfficeCommandVisibleNonAce || isExportToOfficeCommandVisibleAce ) && !is4GDObject;

        if( isShowTemplate ) {
            tabs.push( templateTab );
        }
    }

    // only in search local we need construct tabs
    if( JSON.parse( isInAsShownLocation ) ) {
        var exportAllSearchResults = {
            type: 'BOOLEAN',
            dbValue: true,
            isEditable: JSON.parse( hasSelected )
        };

        var property = modelPropertyService.createViewModelProperty( exportAllSearchResults );
        property.propertyRadioTrueText = data.exportAllSearchResults.propertyRadioTrueText;
        property.propertyRadioFalseText = data.exportAllSearchResults.propertyRadioFalseText;
        property.labelPosition = 'PROPERTY_LABEL_AT_RIGHT';
        property.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
        property.vertical = true;
        data.exportAllSearchResults = property;

        data.tabModels.dbValues = tabs;
    }
};

/**
 * create the Export panel when reveal
 * @param {Object} data - The view model data
 * @param {String} asShown - The localized string for AsShown
 * @param {string} template - The localized string for Template
 */
export let revealExportPanel = function( data, asShown, template ) {
    var exportTabsCtx = appCtxService.getCtx( 'exportTabLocalNameCtx' );
    if( !exportTabsCtx ) {
        exportTabsCtx = {
            asShownName: asShown,
            templateName: template
        };
        appCtxService.registerCtx( 'exportTabLocalNameCtx', exportTabsCtx );
    } else {
        asShown = exportTabsCtx.asShownName;
        template = exportTabsCtx.templateName;
    }

    exports.createExportPanel( data, asShown, template );
};

/**
 * update the Export panel based on selection dynamically
 * @param {Object} data - The view model data
 * @param {String} asShown - The localized string for AsShown
 * @param {string} template - The localized string for Template
 */
export let reCreateViewModelForSelect = function( data ) {
    var exportTabsCtx = appCtxService.getCtx( 'exportTabLocalNameCtx' );
    var asShownLocalValue = exportTabsCtx.asShownName;
    var templatelocalValue = exportTabsCtx.templateName;

    exports.createExportPanel( data, asShownLocalValue, templatelocalValue );
};

/* eslint-disable-next-line valid-jsdoc*/
const exports = {
    createExportPanel,
    revealExportPanel,
    reCreateViewModelForSelect
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member Awp0ExportToExcelService
 */
app.factory( 'Awp0ExportToExcelService', () => exports );
