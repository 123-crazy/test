// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Utility service for printing control plan report

 * @module js/Cip0PrintService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'soa/kernel/soaService';

var exports = {};

/**
 * Gets the underlying object for the selection. For selection of an occurrence in a BOM, the underlying object is
 * typically an Control Plan Revision object. If there is no underlying object, the selected object is returned.
 *
 * @param {object} ctx - Application Context
 *
 */
var getUnderlyingObject = function( selected ) {
    var underlyingObj = null;
    if( selected ) {
        var underlyingObjProp = selected.props[ "awb0UnderlyingObject" ];
        if( !_.isUndefined( underlyingObjProp ) ) {
            underlyingObj = cdm.getObject( underlyingObjProp.dbValues[ 0 ] );
        } else {
            underlyingObj = selected;
        }
    }
    return underlyingObj;
};

/**
 * Get the control plan report stylesheets 
 *
 * @return {ObjectArray} data the data object in scope
 */
export let getPrintStylesheets = function( response ) {
    var reportdefinition = response.reportdefinitions[ 0 ].reportdefinition;
    var relatedStylesheets = [];

    _.forEach( reportdefinition.props.rd_style_sheets.dbValues, function( stylesheetUid ) {
        relatedStylesheets.push( cdm.getObject( stylesheetUid ) );
    } );

    return relatedStylesheets;
};

/**
 * Create the SOA Input for the generateControlPlanNormDoc SOA. 
 */
export let createSOAInput = function( data ) {
    var controlPlan = getUnderlyingObject( appCtxSvc.ctx.mselected[ 0 ] );
    var controlPlanObjectName = controlPlan.props.object_name.dbValues[ 0 ];
    var cpDatasetName = controlPlanObjectName.trim() + "_Norm_Document";
    // set the default revision rule as 'latest working'
    var contextRevRule = "Latest Working";

    // load the revision rule applied on the structure from the product structure
    if( appCtxSvc.ctx.occmgmtContext.productContextInfo.props.awb0CurrentRevRule.uiValues ) {
        // No need to consider localization as revision rule names never gets localized.
        contextRevRule = appCtxSvc.ctx.occmgmtContext.productContextInfo.props.awb0CurrentRevRule.uiValues[ 0 ];
    }

    var generateReportInput = {
        contextObject: controlPlan,
        reportDefinitionObject: appCtxSvc.ctx.cip0Print.contronPlanRepDef,
        stylesheetObject: data.printTemplates.dbValue,
        // report name would be empty as we are passing the report definition object 
        reportName: "",
        // provide a dataset name as server expects a non empty name
        datasetName: cpDatasetName,
        criteriaValuesMap: {
            "BOM_REPORT": "TRUE",
            "REV_RULE": contextRevRule,
            "PACKED_BOM": "TRUE"
        },
        reportOptionMap: {
            "report_locale": "en_US",
            "runAsync": "false"
        }
    };

    return generateReportInput;
};

export default exports = {
    getPrintStylesheets,
    createSOAInput
};
/**
 * Utility service for printing control plan report
 *
 * @memberof NgServices
 * @member Cip0PrintService
 */
app.factory( 'Cip0PrintService', () => exports );
