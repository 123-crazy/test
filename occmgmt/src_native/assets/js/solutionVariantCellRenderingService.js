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
 * @module js/solutionVariantCellRenderingService
 */
import app from 'app';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import localeService from 'js/localeService';

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};
let localeTextBundle = localeService.getLoadedText('SolutionVariantConstants');

/**
 * Set color and font of Solution Variant Structure column in Solution Variant Preview
 */
let _solutionVariantStructureCellRenderer = {
    action: function (column, vmo, tableElem) {
        let cellContent = _t.Cell.createElement(column, vmo, tableElem);
        cellContent.classList.add('aw-jswidgets-change');
        return cellContent;
    },
    condition: function (column, vmo) {
        if (_.isEqual(column.displayName, localeTextBundle.solutionVariantStructure) && vmo.props
            && vmo.props.smc1SVSourceCategory && vmo.props.smc1SVSourceCategory.dbValues.length > 0
            && vmo.props.smc1SVSourceCategory.dbValues[0] === '2') {
            return true;
        }
        return false;
    },
    name: 'solutionVariantStructureCellRenderer'
};

/**
 * Set cell template for column definitions
 * @param {Object} columnInfos - Column definitions on which cell class function is to be registered
 */
export let setSolutionVariantCellTemplate = function (columnInfos) {
    _.forEach(columnInfos, function (column) {
        column.cellRenderers.push(_solutionVariantStructureCellRenderer);
    });
};

export default exports = {
    setSolutionVariantCellTemplate
};

/**
 * @memberof NgServices
 * @member solutionVariantCellRenderingService
 */
app.factory('solutionVariantCellRenderingService', () => exports);