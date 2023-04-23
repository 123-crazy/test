// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/CadBomOccurrenceAlignmentUtil
 */

import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import _ from 'lodash';
import CadBomAlignmentUtil from 'js/CadBomAlignmentUtil';
import cbaConstants from 'js/cbaConstants';
import cbaObjectTypeService from 'js/cbaObjectTypeService';
import dataManagementService from 'soa/dataManagementService';
import occmgmtUtil from 'js/occmgmtUtils';

let exports = {};

/**
 * Update state from URL parameters
 *
 * @param {Object} paramsToBeStoredOnUrl The object containing URL parametrers
 */
export let addParametersOnUrl = function( paramsToBeStoredOnUrl ) {
    _.forEach( paramsToBeStoredOnUrl, function( value, name ) {
        AwStateService.instance.params[ name ] = value;
    } );
    AwStateService.instance.go( AwStateService.instance.current.name, AwStateService.instance.params );
};

/**
 * Checks if either Source or Target row has been selected from UI
 * @param {String} path - appCtx path that need to be updated
 * @param {String} value - Value to be set for appCtx path
 */
export let updateCBAContextOnRowSelection = function( path, value ) {
    let isTrue = value === 'true';
    appCtxSvc.updatePartialCtx( path, isTrue );
};

/**
 * Update model object in context
 * @param {object} data - data
 */
export let updateModelObjectInContext = function( data ) {
    if( data && data.selection ) {
        let modelObject = cdmSvc.getObject( data.selection.uid );
        appCtxSvc.updatePartialCtx( data.source + '.modelObject', modelObject );
        appCtxSvc.updatePartialCtx( data.source + '.currentState.uid', modelObject.uid );

        if( data.source === cbaConstants.CBA_SRC_CONTEXT ) {
            appCtxSvc.updatePartialCtx( 'cbaContext.srcStructure', modelObject );
        } else if( data.source === cbaConstants.CBA_TRG_CONTEXT ) {
            appCtxSvc.updatePartialCtx( 'cbaContext.trgStructure', modelObject );
        }
    }
};

/**
 * Load properties for objects
 * @param {String} objects - list of object Uids to load given properties
 * @param {String} properties - List of properties to load
 *
 * @returns {Promise} After properties load return promise.
 */
export let loadProperties = function( objects, properties ) {
    if( objects && objects.length && properties && properties.length ) {
        let deferred = AwPromiseService.instance.defer();
        let uidsToload = [];
        _.forEach( objects, function( object ) {
            for( let index = 0; index < properties.length; index++ ) {
                const property = properties[ index ];
                if( !( object.props && object.props[ property ] ) ) {
                    uidsToload.push( object.uid );
                    break;
                }
            }
        } );
        if( uidsToload.length ) {
            dataManagementService.getProperties( uidsToload, properties ).then( function() {
                deferred.resolve( null );
            } );
            return deferred.promise;
        }
    }
    return AwPromiseService.instance.resolve( null );
};

/**
 * @param {Object} sourceObject The source object
 * @param {Object} targetObject The target object
 * @param {Object} invalidTypes List of invalid type of object and reason to open in CBA
 * @param {String} errorMessageKey error Message key to read from L10N file.
 * @returns {String} The error message text
 */
export let getErrorMessage = function( sourceObject, targetObject, invalidTypes, errorMessageKey ) {
    return AwPromiseService.instance.all( {
        uiMessages: localeService.getTextPromise( 'CadBomAlignmentMessages' )
    } ).then( function( localizedText ) {
        let deferred = AwPromiseService.instance.defer();
        let errorText;
        if( invalidTypes ) {
            let promise = loadProperties( invalidTypes, [ 'object_name' ] );
            promise.then( function() {
                let object = invalidTypes[ 0 ];
                let objNameProp = CadBomAlignmentUtil.getPropertyValueFromObject( object, 'props.object_name' );
                let objectName = objNameProp && objNameProp.dbValues.length ? objNameProp.dbValues[ 0 ] : '';
                if( errorMessageKey ) {
                    errorText = localizedText.uiMessages[ errorMessageKey ].format( objectName );
                } else {
                    if( !appCtxSvc.ctx.panelContext ) {
                        if( !sourceObject && !targetObject || invalidTypes.length === 0 ) {
                            errorText = localizedText.uiMessages.InvalidObjectsForAlignment;
                        } else if( !sourceObject ) {
                            errorText = localizedText.uiMessages.InvalidDesignForAlignment.format( objectName );
                        } else if( !targetObject ) {
                            errorText = localizedText.uiMessages.InvalidPartForAlignment.format( objectName );
                        }
                    } else {
                        if( !sourceObject ) {
                            errorText = localizedText.uiMessages.InvalidDesignDBOMForAlignment.format( objectName );
                        } else {
                            errorText = localizedText.uiMessages.InvalidPartEBOMForAlignment.format( objectName );
                        }
                    }
                }
                deferred.resolve( errorText );
            } );
        } else {
            deferred.resolve( errorText );
        }
        return deferred.promise;
    } );
};

/**
 * Get loaded VMO uid for the given underlying object uids
 *
 * @param {List} underlyingObjUids - List of uids of underlying objects
 * @param {string} contextKey - context key from which loaded VMO to fetch,
 * if not specified VMO will be fetched from both source and taget context.
 * @returns {List} - List of VMO uids
 */
export let getLoadedVMO = function( underlyingObjUids, contextKey ) {
    let outputVMOs = [];
    let contexts = [];

    if( contextKey ) {
        contexts[ 0 ] = contextKey;
    } else {
        contexts = appCtxSvc.ctx.splitView.viewKeys;
    }

    _.forEach( contexts, function( context ) {
        let loadedVMOs = appCtxSvc.ctx[ context ].vmc.loadedVMObjects;

        _.forEach( loadedVMOs, function( vmo ) {
            let awb0UnderlyingObject = CadBomAlignmentUtil.getPropertyValueFromObject( vmo, 'props.awb0UnderlyingObject' );
            if( awb0UnderlyingObject ) {
                let underlyingObjUid = awb0UnderlyingObject.dbValues[ 0 ];
                if( underlyingObjUids.includes( underlyingObjUid ) ) {
                    outputVMOs.push( vmo.uid );
                }
            }
        } );
    } );
    return outputVMOs;
};

/**
 * Register Split Mode
 */
export let registerSplitViewMode = function() {
    appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_MODE, true );
    appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_VIEWKEYS, [ cbaConstants.CBA_SRC_CONTEXT, cbaConstants.CBA_TRG_CONTEXT ] );
};

/**
 * Un-Register Split Mode
 */
export let unRegisterSplitViewMode = function() {
    let cbaViewKeys = appCtxSvc.getCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_VIEWKEYS );
    _.forEach( cbaViewKeys, function( cbaViewKey ) {
        appCtxSvc.unRegisterCtx( cbaViewKey );
    } );
    appCtxSvc.unRegisterCtx( cbaConstants.CTX_PATH_SPLIT_VIEW );
};


/**
 * Check if current application is CBA
 * @returns {boolean} True if current application is CBA else False
 */
export let isCBAView = function() {
    let nameToken = appCtxSvc.getCtx( cbaConstants.CTX_PATH_SUBLOCATION_NAMETOKEN );
    return nameToken === 'com.siemens.splm.client.cba.CADBOMAlignment:CBASublocation';
};

/**
 * Check if split application is other than CBA
 * @returns {boolean} True if split application is other than CBA else False
 */
export let isNonCBASplitLocation = function() {
    let isSplitMode = appCtxSvc.getCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_MODE );
    return isSplitMode && !isCBAView();
};

/**
 * Get children for a given parent node
 * @param {object} parentVMO - parent VMO for which all children to be retrieved
 * 
 * @returns {Array} array of child objects
 */
export let getChildrenForVMO = function( parentVMO ) {
    let childObjects = [];
    let childVMOs = occmgmtUtil.getImmediateChildrenOfGivenParentNode( parentVMO );
    if( childVMOs ) {
        for( let i = 0, len = childVMOs.length; i < len; i++ ) {
           childObjects.push( childVMOs[ i ] );
           if( childVMOs[ i ].isLeaf ) {
               continue;
           }
           childObjects = childObjects.concat( getChildrenForVMO( childVMOs[ i ] ) );
        }
    }
    return childObjects;
};

/**
 * Check if ViewModelObject is valid for alignment. VMO will be valid if it has Part Required or Design Required property as true OR It's a SV Product Usage Occ.
 * @param {ViewModelObject} vmo  - Object to check.
 * @returns {boolean} - returns true if vmo is valid for alignment else false.
 */
 export let isValidObjectForAlignment = function( vmo ) {
    if( vmo && vmo.props ) {
        let isDesignPartRequiredProp = vmo.props.pma1IsDesignRequired ? vmo.props.pma1IsDesignRequired : vmo.props.pma1IsPartRequired;
        if( isDesignPartRequiredProp && ( isDesignPartRequiredProp.dbValues[ 0 ] === '1' || isDesignPartRequiredProp.dbValues[ 0 ] === 'true' ) ) {
            return true;
        }
        if( vmo.props.awb0IsVi && vmo.props.awb0IsVi.dbValues[ 0 ] === '1' &&  cbaObjectTypeService.isObjectOfGivenType( cdmSvc.getObject( vmo.props.awb0UnderlyingObject.dbValues[0] ), cbaConstants.PRODUCT_EBOM )  ) {
            return true;
        }
    }
    return false;
};

/**
 * Check if multiple structures are opened in CBA.
 * @returns {boolean} true if source and target both structures are opened in CBA 
 */
export let areMultipleStructuresInCBA = function() {
    let srcTopObject = appCtxSvc.getCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE );
    let trgTopObject = appCtxSvc.getCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE );
    return Boolean( srcTopObject && trgTopObject );
};

/**
 * Gets icon image source path
 *
 * @param {Object} indicatorFile Indicator file name
 * @return {String} image source
 */
 let getIconSourcePath = function( indicatorFile ) {
    let imagePath = app.getBaseUrlPath() + '/image/';
    imagePath += indicatorFile;
    return imagePath;
};

/**
 * CAD-BOM Occurrence Alignment Util
 */
export default exports = {
    addParametersOnUrl,
    updateCBAContextOnRowSelection,
    updateModelObjectInContext,
    loadProperties,
    getErrorMessage,
    getLoadedVMO,
    registerSplitViewMode,
    unRegisterSplitViewMode,
    isCBAView,
    isNonCBASplitLocation,
    getChildrenForVMO,
    isValidObjectForAlignment,
    areMultipleStructuresInCBA,
    getIconSourcePath
};
app.factory( 'CadBomOccurrenceAlignmentUtil', () => exports );
