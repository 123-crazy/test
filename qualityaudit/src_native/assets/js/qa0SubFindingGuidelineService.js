// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/qa0SubFindingGuidelineService
 */

 import app from 'app';
 import appCtxSvc from 'js/appCtxService';

 var exports = {};

 /**
  * This method is used to get the LOV values for the versioning panel.
  * @param {Object} response the response of the getLov soa
  * @returns {Object} value the LOV value
  */

export let getLOVList = function( response ) {
    var ctx = appCtxSvc.ctx;
    var selected = ctx.pselected;
    if ( ctx.pselected.type === 'Qa0QualityAudit' ) {
        selected = ctx.pselected;
    } else if ( ctx.xrtSummaryContextObject.type === 'Qa0QualityAudit' ) {
        selected = ctx.xrtSummaryContextObject;
    }
    var findingGuidelines = response.lovValues;
    if( selected.props.qa0AuditNorms ) {
        var auditNorms = selected.props.qa0AuditNorms.displayValues;
        if( auditNorms.length > 0 ) { // Filter the finding guideline only when there is audit norms present.
            findingGuidelines = response.lovValues.filter( ( values ) =>{
                var findingGuidelineNorms = values.propDisplayValues.qa0AuditNorms[0].split( ',' );
                if( findingGuidelineNorms.length > 0 && findingGuidelineNorms[0].length > 0 ) { // check for the emptry string in the array, when it has no audit norms assigned
                   return findingGuidelineNorms.find( norms => {
                        return auditNorms.includes( norms );
                    } );
                }
             } );
         }
    }
    var lovList = findingGuidelines.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.object_name[ 0 ],
            propDisplayDescription: obj.propDisplayValues.object_name[ 0 ] + ' ' + obj.propDisplayValues.object_desc[ 0 ],
            propInternalValue: obj.propInternalValues.object_name[ 0 ]
        };
    } );
     lovList.unshift( {
         propDisplayValue: '',
         propDisplayDescription: '',
         propInternalValue: ''
     } );

     return lovList;
 };

 export let setFindingGuideline = function( data ) {
     var selectedFindingGuidelineCtx = appCtxSvc.getCtx( 'selectedFindingGuideline' );
    if( selectedFindingGuidelineCtx ) {
     appCtxSvc.updateCtx( 'selectedFindingGuideline', data.findingGuideline.dbValue );
    } else {
        appCtxSvc.registerCtx( 'selectedFindingGuideline', data.findingGuideline.dbValue );
    }
 };


 export let clearFindingGuideline = function( ) {
     appCtxSvc.unRegisterCtx( 'selectedFindingGuideline' );
 };

 export default exports = {
     getLOVList,
     setFindingGuideline,
     clearFindingGuideline
 };

 /**
  * @member qa0SubFindingGuidelineService
  * @memberof NgServices
  */
 app.factory( 'qa0SubFindingGuidelineService', () => exports );


