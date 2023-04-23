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
 * @module js/qfm0FailureAnalysisTableServices
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import parsingUtils from 'js/parsingUtils';
import selectionService from 'js/selection.service';
import adapterService from 'js/adapterService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';

/**
 * Cached static default AwTableColumnInfo.
 */
var _failureAnalysisNonModifiableCols = [ 'object_name' ];
var QFM0FAILUREELEMENT = 'Qfm0FailureElement';

var exports = {};

/**
 * Process the response from Server
 * @argument {Object} response  soa response
 * @argument {Object} DeclViewModel declarative view model
 * @returns {Object} failure cause/effect object
 */
export let processFailureAnalysisObjects = function( response, data ) {
    if ( response && response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var vmos = [];
    if ( response && response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if ( searchResults && searchResults.objects.length > 0 ) {
            _.forEach( searchResults.objects, function( results ) {
                if ( results ) {
                    var vmo = data.attachModelObject( results.uid, 'EDIT', null, results );
                    if( vmo.props.relation.dbValues[0] === 'Qfm0Effect' ) {
                        let intermediateUid = uwPropertyService.getRelationObjectUid( vmo.props['GRMS2PREL(Qfm0Effect,Qfm0FailureElement).aqc0Order'] );
                        if( intermediateUid === vmo.props.awp0Relationship.dbValues[0] ) {
                            vmos.push( vmo );
                        }
                    } else if( vmo.props.relation.dbValues[0] === 'Qfm0Cause' ) {
                        let intermediateUid = uwPropertyService.getRelationObjectUid( vmo.props['GRMS2PREL(Qfm0Cause,Qfm0FailureElement).aqc0Order'] );
                        if( intermediateUid === vmo.props.awp0Relationship.dbValues[0] ) {
                            vmos.push( vmo );
                        }
                    } else{
                        vmos.push( vmo );
                    }
                }
            } );
        }
    }
    return vmos;
};


/**
 * Method to set properties on failure cause and effect Business Object modifiable
 * @param {Object} columnConfig - columnConfig to set the properties non-modifiable
 * @returns {Object}
 */

export let setNonModifiablePropForAbsFailureAnalysis = function( response ) {
    if ( response && response.columnConfig && response.columnConfig.columns ) {
        for ( var index = 0; index < response.columnConfig.columns.length; index++ ) {
            if ( _failureAnalysisNonModifiableCols.indexOf( response.columnConfig.columns[index].propertyName ) !== -1 ) {
                response.columnConfig.columns[index].modifiable = false;
            }
            //Make Severity non-modifiable depending upon the preferences
            if(response.columnConfig.columns[index].propertyName === 'qfm0Severity'){
                let ctxPreferences = appCtxService.getCtx( 'preferences' );
                if(ctxPreferences && ctxPreferences.FMEA_cascaded_severity && ctxPreferences.FMEA_cascaded_severity[0] &&
                    ctxPreferences.FMEA_cascaded_severity[0].toUpperCase() === 'TRUE'){
                        response.columnConfig.columns[index].modifiable = false;
                    }
            }         
        }
        return response.columnConfig;
    }
};

/**
 * Evaluate primary object for failure cause/effect based on the selection
 * @returns {Object}
 */

export let getSelectedFailureMode = function() {
    if ( appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( QFM0FAILUREELEMENT ) > -1
        && appCtxService.ctx.pselected !== undefined && appCtxService.ctx.pselected !== null
        && appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( QFM0FAILUREELEMENT ) > -1 ) {
        return appCtxService.ctx.pselected.uid;
    } else if ( appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( QFM0FAILUREELEMENT ) > -1
        && ( appCtxService.ctx.pselected === undefined || appCtxService.ctx.pselected === null || appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Qfm0FMEANode' ) > -1 ) || appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf('Qfm0SystemElement') > -1 ) {
        return appCtxService.ctx.selected.uid;
    }
};


/**
 * set failure cause dataprovider
 */
export let setCauseProviderForEdit = function( data, ctx ) {
    if ( ctx.fmeaContext === undefined ) {
        ctx.fmeaContext = {};
    }
    ctx.fmeaContext.failureCauseTableProvider = data.dataProviders.failureCauseTableProvider;
};

/**
 * set failure effect dataprovider
 */
export let setEffectProviderForEdit = function( data, ctx ) {
    if ( ctx.fmeaContext === undefined ) {
        ctx.fmeaContext = {};
    }
    ctx.fmeaContext.failureEffectTableProvider = data.dataProviders.failureEffectTableProvider;
};

/**
 * This method will derive adapted object from AwXrtObjectSetRow
 * @param {data} data of the selected Objects
 * @param {ctx} ctx of the selected Objects
 * @param {relationType} sourceObjects of the selected Objects
  */
export let getAdaptedObjects = function( data, ctx, relationType ) {
    var sourceObjects = ctx.mselected;
    var selection = selectionService.getSelection();
    if ( sourceObjects.length > 0 && selection && selection.parent ) {
        var adaptedObjsPromise = adapterService.getAdaptedObjects( sourceObjects );

        adaptedObjsPromise.then( function( adaptedObjs ) {
            selectionService.updateSelection( adaptedObjs, selection.parent );
            setRelationContext( adaptedObjs, selection.parent, relationType );
        } );
    }
};


var setRelationContext = function( adaptedObjs, parent, relationType ) {
    var relationInfo;
    relationInfo = {
        relationInfo: [ {
            primaryObject: parent,
            relationObject: null,
            relationType: relationType,
            secondaryObject: adaptedObjs[0]
        } ]
    };


    appCtxService.registerCtx( 'relationContext', relationInfo );
};

export default exports = {
    getSelectedFailureMode,
    processFailureAnalysisObjects,
    setNonModifiablePropForAbsFailureAnalysis,
    setCauseProviderForEdit,
    setEffectProviderForEdit,
    getAdaptedObjects
};
/**
 * @memberof NgServices
 * @member qfm0FailureAnalysisServices
 */
app.factory( 'qfm0FailureAnalysisServices', () => exports );
