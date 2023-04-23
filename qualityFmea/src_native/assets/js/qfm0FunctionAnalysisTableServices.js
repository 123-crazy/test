// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/qfm0FunctionAnalysisTableServices
 */
import app from 'app';
import parsingUtils from 'js/parsingUtils';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import selectionService from 'js/selection.service';
import adapterService from 'js/adapterService';
import uwPropertyService from 'js/uwPropertyService';

var QFM0FUNCTIONELEMENT = 'Qfm0FunctionElement';
var _functionAnalysisNonModifiableCols = [ 'object_name' ];

var exports = {};

/**
 * Process the response from Server
 * @argument {Object} response  soa response
 * @argument {Object} DeclViewModel declarative view model
 * @returns {Object} function higher and lower level object
 */
export let processFunctionAnalysisObjects = function( response, data ) {
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
                    if( vmo.props.relation.dbValues[0] === 'Qfm0CalledBy' ) {
                        let intermediateUid = uwPropertyService.getRelationObjectUid( vmo.props['GRMS2PREL(Qfm0CalledBy,Qfm0FunctionElement).aqc0Order'] );
                        if( intermediateUid === vmo.props.awp0Relationship.dbValues[0] ) {
                            vmos.push( vmo );
                        }
                    } else if( vmo.props.relation.dbValues[0] === 'Qfm0Calling' ) {
                        let intermediateUid = uwPropertyService.getRelationObjectUid( vmo.props['GRMS2PREL(Qfm0Calling,Qfm0FunctionElement).aqc0Order'] );
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
 * Method to set properties on function higher and lower level Business Object modifiable
 * @param {Object} columnConfig - columnConfig to set the properties non-modifiable
 * @returns {Object}
 */

export let setNonModifiablePropForAbsFunctionAnalysis = function( response ) {
    if ( response && response.columnConfig && response.columnConfig.columns ) {
        for ( var index = 0; index < response.columnConfig.columns.length; index++ ) {
            if ( _functionAnalysisNonModifiableCols.indexOf( response.columnConfig.columns[index].propertyName ) !== -1 ) {
                response.columnConfig.columns[index].modifiable = false;
            }
        }
        return response.columnConfig;
    }
};


/**
 * Evaluate primary object for function higher and lower level based on the selection
 * @returns {Object}
 */

export let getSelectedFunction = function() {
    if ( appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( QFM0FUNCTIONELEMENT ) > -1
        && appCtxService.ctx.pselected !== undefined && appCtxService.ctx.pselected !== null
        && appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( QFM0FUNCTIONELEMENT ) > -1 ) {
        return appCtxService.ctx.pselected.uid;
    } else if ( appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( QFM0FUNCTIONELEMENT ) > -1
        && ( appCtxService.ctx.pselected === undefined || appCtxService.ctx.pselected === null || appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Qfm0FMEANode' ) > -1  || appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf('Qfm0SystemElement') > -1 ) ) {
        return appCtxService.ctx.selected.uid;
    }
};


/**
 * set function higher level dataprovider
 */
export let setHigherLevelFunctionProviderForEdit = function( data, ctx ) {
    if ( ctx.fmeaContext === undefined ) {
        ctx.fmeaContext = {};
    }
    ctx.fmeaContext.higherLevelFunctionTableProvider = data.dataProviders.higherLevelFunctionTableProvider;
};

/**
 * set function lower dataprovider
 */
export let setLowerLevelFunctionProviderForEdit = function( data, ctx ) {
    if ( ctx.fmeaContext === undefined ) {
        ctx.fmeaContext = {};
    }
    ctx.fmeaContext.lowerLevelFunctionTableProvider = data.dataProviders.lowerLevelFunctionTableProvider;
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
/*
*   Set relation context based on the selected lower level and higher level function
*/
export let setRelationContext = function( adaptedObjs, parent, relationType ) {
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
    getSelectedFunction,
    setRelationContext,
    setHigherLevelFunctionProviderForEdit,
    setLowerLevelFunctionProviderForEdit,
    processFunctionAnalysisObjects,
    setNonModifiablePropForAbsFunctionAnalysis,
    getAdaptedObjects
};
/**
 * @memberof NgServices
 * @member qfm0FunctionAnalysisTableServices
 */
app.factory( 'qfm0FunctionAnalysisTableServices', () => exports );
