//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Arm0LoadSpecService
 */
import app from 'app';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import reqACEUtils from 'js/requirementsACEUtils';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';

var exports = {};

var PAGE_SIZE = 3;
var content;


/**
 * Set content when documentation tab is loaded.
 *
 * @param {Object} data - The panel's view model object
 */
export let setDocumentationContent = function( data ) {
    content = data.content;
};

/**
 * Get content when documentation tab is loaded.
 */
export let getDocumentationContent = function() {
    return content;
};

/**
 * Get NextOccuraceData .
 *
 * @param {Object} data - view model data
 * @param {Object} ctx - ctx
 * @param {Object} inputCtxt -
 * @returns {Array} Next child occ data
 */
var _getNextOccuranceData = function( data, ctx, inputCtxt, selectedObject ) {
    var goForward = data.goForward;
    var curTopBottomInfo = {};
    var nextChildOccData = {};

     if( data.arm0PageUpOrDownAction ) {
         // Page Up/down
        curTopBottomInfo = {
            startOcc: data.content.cursor.startOcc,
            endOcc: data.content.cursor.endOcc
        };

        nextChildOccData = reqACEUtils.getCursorInfoForNextFetch( data.content.cursor, PAGE_SIZE, goForward,
            curTopBottomInfo );
     } else {
        // Its first time loading OR selection
        data.goForward = true;
        var prodCtxt = occMgmtStateHandler.getProductContextInfo();
        if( prodCtxt ) {
            nextChildOccData = reqACEUtils.getCursorInfoForFirstFetch( prodCtxt, PAGE_SIZE, data.goForward, inputCtxt, selectedObject );
        }
    }

    return nextChildOccData;
};

/**
 * Get Input data for getSpecificationSegmentInputForSelected.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInputForSelected = function( data, ctx ) {

    return getSpecificationSegmentInput( data, ctx );
 };

/**
 * Get Input data for getSpecificationSegment.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInput = function( data, ctx ) {
    // By default top element will be send as default input objects
    var topSelectObj = reqACEUtils.getTopSelectedObject( ctx );

    var selectObj = ctx.selected;
    if ( selectObj.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
        selectObj = ctx.pselected;
    }
    var inputCtxt = reqACEUtils.getInputContext();
    return {
        inputCtxt: inputCtxt,
        inputObjects: [ topSelectObj ],
        nextOccData: _getNextOccuranceData( data, ctx, inputCtxt, selectObj ),
        options: [ 'FirstLevelOnly', 'EditMode' ]
    };
};

/**
 * Get Input data for getSpecificationSegment.
 *
 * @returns {Object} - Json object for SOA input
 */
 export let getSpecificationSegmentInputForObjectsToLoad = function( uidsToLoad ) {
    var inputObjects = [];
    uidsToLoad.forEach( uid => {
        inputObjects.push( { uid: uid } );
    } );

    var inputCtxt = reqACEUtils.getInputContext();
    return {
        inputCtxt: inputCtxt,
        inputObjects: inputObjects,
        options: [ 'ExportContentWithTraceLinks' ]
    };
};

/**
 * Call SOA for getSpecificationSegment with Property Policy Override
 *
 * @param {Object} inputData Input Data for SOA call
 * @param {Object} propertyPolicyOverride Property Policy
 * @returns {Object} - Json object
 */
export let getSpecificationSegment = function( inputData, propertyPolicyOverride ) {
    return soaSvc.post( 'Internal-AwReqMgmtSe-2019-06-SpecNavigation', 'getSpecificationSegment', inputData, propertyPolicyOverride );
};

/**
 * Service for Arm0LoadSpecService.
 *
 * @member Arm0LoadSpecService
 */

export default exports = {
    getSpecificationSegmentInput,
    getSpecificationSegment,
    setDocumentationContent,
    getDocumentationContent,
    getSpecificationSegmentInputForSelected,
    getSpecificationSegmentInputForObjectsToLoad
};
app.factory( 'Arm0LoadSpecService', () => exports );
