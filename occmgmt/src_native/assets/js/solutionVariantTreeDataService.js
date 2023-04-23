//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/solutionVariantTreeDataService
 */
import app from 'app';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import localeService from 'js/localeService';
import occmgmtTreeTableDataSvc from 'js/occmgmtTreeTableDataService';
import solutionVariantCellRenderingService from 'js/solutionVariantCellRenderingService';
import treeTableDataService from 'js/treeTableDataService';

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};
let localeTextBundle = localeService.getLoadedText('SolutionVariantConstants');

function _resetContextState(contextKey) {
    appCtxSvc.ctx[contextKey].retainTreeExpansionStates = false;
    appCtxSvc.updatePartialCtx(contextKey + '.treeLoadingInProgress', false);
    if (appCtxSvc.ctx[contextKey].transientRequestPref.selectionToUpdatePostTreeLoad) {
        contextStateMgmtService.syncContextState(contextKey, appCtxSvc.ctx[contextKey].transientRequestPref.selectionToUpdatePostTreeLoad);
    }
    appCtxSvc.ctx[contextKey].transientRequestPref = {};
    delete appCtxSvc.ctx[contextKey].retainTreeExpansionStateInJitterFreeWay;
}

/**
 * Get a object containing callback function.
 * @return {Object} A object containing callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function (propColumns, allChildNodes, contextKey, response, uwDataProvider) {
        var columnConfigResult = null;
        let clientColumns = uwDataProvider && !_.isEmpty(uwDataProvider.cols) ? _.filter(uwDataProvider.cols, { clientColumn: true }) : [];
        propColumns = clientColumns.length > 0 ? _.concat(clientColumns, propColumns) : propColumns;
        occmgmtTreeTableDataSvc.updateColumnPropsAndNodeIconURLs(propColumns, allChildNodes, contextKey);
        solutionVariantCellRenderingService.setSolutionVariantCellTemplate(propColumns);

        let columnsConfig = response.output.columnConfig;
        columnsConfig.columns = _.sortBy(propColumns, function (column) { return column.columnOrder; });
        columnsConfig.columns[0].displayName = localeTextBundle.sourceStructure;
        columnsConfig.columns[0].sortDirection = "";
        columnConfigResult = columnsConfig;

        _resetContextState(contextKey);
        return columnConfigResult;
    };
    return updateColumnPropsCallback;
}

export let getContextKeyFromParentScope = function (parentScope) {
    return contextStateMgmtService.getContextKeyFromParentScope(parentScope);
};

export let loadTreeTableProperties = function () {
    arguments[0].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve(treeTableDataService.loadTreeTableProperties(arguments[0]));
};

export default exports = {
    loadTreeTableProperties,
    getContextKeyFromParentScope
};

/**
 * @memberof NgServices
 * @member solutionVariantTreeDataService
 */
app.factory('solutionVariantTreeDataService', () => exports);