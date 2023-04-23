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
 * Service to define functions related to open panel in CBA
 * @module js/cbaOpenInViewPanelService
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import cbaRelatedObjectService from 'js/cbaRelatedObjectService';
import cbaObjectTypeService from 'js/cbaObjectTypeService';
import localeService from 'js/localeService';
import cbaConstants from 'js/cbaConstants';
import CadBomOccurrenceAlignmentUtil from 'js/CadBomOccurrenceAlignmentUtil';
import CadBomAlignmentUtil from 'js/CadBomAlignmentUtil';
import CBAImpactAnalysisService from 'js/CBAImpactAnalysisService';
import messagingService from 'js/messagingService';
import adapterSvc from 'js/adapterService';

let exports = {};

/**
 * Returns provider name as per type of modelObject.
 * @param {Object} modelObject - selected object from CBA Page
 * @return {String} - Provider name
 */
export let getProviderAndSectionName = function( modelObject ) {
    let deferred = AwPromiseService.instance.defer();

    let providerName; let  sectionName;
    //If CBA is launched from ECN, directly fetch the provider details from ECN context.
    //This provider internally differentiates between design and part types and returns the appropriate related object.
    //We can therefore avoid the input type check.
    if( CBAImpactAnalysisService.isImpactAnalysisMode() ) {
        return CBAImpactAnalysisService.getProviderName();
    }
    let selectedObjects = [ modelObject ];
    let promise = cbaObjectTypeService.getDesignsAndParts( selectedObjects );
    promise.then( function( resultData ) {
        if( resultData.designTypes.includes( modelObject ) ) {
            providerName = cbaConstants.ALIGNED_PARTS_PROVIDER;
            sectionName = cbaConstants.LINKED_ENGINEERING_BOM;
        } else if( resultData.partTypes.includes( modelObject ) ) {
            providerName = cbaConstants.ALIGNED_DESIGNS_PROVIDER;
            sectionName = cbaConstants.LINKED_DESIGN_BOM;
        } else if ( resultData.productTypes.includes( modelObject ) ) {
            providerName = cbaConstants.LINKED_ITEM_PROVIDER;
            sectionName = cbaConstants.LINKED_DESIGN_BOM;
        }
        let output = {
            providerName: providerName,
            sectionName: sectionName
        };

        deferred.resolve( output );
    } );
    return deferred.promise;
};

/**
 * Check if data is available to load in panel :
 * Case 1. If aligned objects are not found then check the linked items for given modelObject
 * Case 2. If there are no linked items for given modelObject then return false
 *
 * @param {*} modelObject - Model object of structure which open in CBA
 * @param {*} providerName - ProviderName
 * @returns {boolean} - true if data is available to load in panel
 */
let getObjectForLinkedBom = function( modelObject, providerName ) {
    let deferred = AwPromiseService.instance.defer();

    let isDataAvailableToLoad = false;
    let newProviderName = providerName;
    cbaRelatedObjectService.getRelatedModelObjects( modelObject, providerName, false ).then( function( modelObjectsArray ) {
        appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_LINKEDBOM_RELATEDMODELOBJECTS, modelObjectsArray );
        let modelObjectsCount = modelObjectsArray.length;
        if ( modelObjectsCount > 0 ) {
            isDataAvailableToLoad = true;
            deferred.resolve( isDataAvailableToLoad );
        } else {
            if( newProviderName === cbaConstants.LINKED_ITEM_PROVIDER ) {
                deferred.resolve( isDataAvailableToLoad );
            } else {
                newProviderName = cbaConstants.LINKED_ITEM_PROVIDER;
                getObjectForLinkedBom( modelObject, newProviderName ).then( function( isDataAvailableToLoad ) {
                    deferred.resolve( isDataAvailableToLoad );
                } );
            }
        }
    } );
    return deferred.promise;
};

/**
 * Update information which required for linked BOM tab in context
 * @param {Object} modelObject - Model object of structure which open in CBA
 * @returns {object} - Returns promise

 */
export let initializeServiceForLinkedBom = function( modelObject ) {
    let getRelatedModelObjectCall;
    let deferred = AwPromiseService.instance.defer();

    isDesignOrPartRequired( modelObject ).then( function( result ) {
        if ( result ||  !result && cbaObjectTypeService.isObjectOfGivenType( modelObject, cbaConstants.PRODUCT_EBOM )  ) {
            getRelatedModelObjectCall = true;
        }

        if ( getRelatedModelObjectCall ) {
            let promise = getProviderAndSectionName( modelObject );
            promise.then( function( resultData ) {
                getObjectForLinkedBom( modelObject, resultData.providerName ).then( function( isDataAvailableToLoad ) {
                    if( isDataAvailableToLoad ) {
                        appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_LINKEDBOM_DATAPROVIDER_NAME, resultData.providerName );
                        localeService.getLocalizedText( 'CadBomAlignmentConstants', resultData.sectionName ).then( function( result ) {
                            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_LINKEDBOM_SECTION_NAME, result );
                        } );
                    }
                    deferred.resolve();
                } );
            } );
        }
    } );

    return deferred.promise;
};

/**
 * Validate if selected object is valid to open in CBA view or oot.
 *
 * @param {string} source - Source or Target context in which open in view panel opened
 * @param {object} selectedObject - object selected in open in view to open
 *
 * @returns {Boolean} True if object is valid to open in CBA page
 */
export let isValidObjectToOpen = function( source, selectedObject ) {
    let deferred = AwPromiseService.instance.defer();
    let selectedObjects = [ selectedObject ];
    let promise = cbaObjectTypeService.getDesignsAndParts( selectedObjects );

    promise.then( function( resultData ) {
        let sourceObject;
        let targetObject;
        let invalidTypes = [];

        if( source === cbaConstants.CBA_SRC_CONTEXT && !resultData.designTypes.includes( selectedObject ) ) {
            targetObject = appCtxSvc.getCtx( 'CBATrgContext.modelObject' );
            invalidTypes.push( selectedObject );
        } else if( source === cbaConstants.CBA_TRG_CONTEXT && !resultData.partTypes.includes( selectedObject ) && !resultData.productTypes.includes( selectedObject ) ) {
            sourceObject = appCtxSvc.getCtx( 'CBASrcContext.modelObject' );
            invalidTypes.push( selectedObject );
        }

        let resultPromise = CadBomAlignmentUtil.isInvalidObjectsForCBA( selectedObjects, invalidTypes );
        resultPromise.then( function( result ) {
            if ( result.invalidTypes ) {
                CadBomOccurrenceAlignmentUtil.getErrorMessage( sourceObject, targetObject, result.invalidTypes, result.errorMessageKey ).then( function( errorText ) {
                    messagingService.showError( errorText );
                } );
            } else {
                deferred.resolve();
            }
        } );
    } );
    return deferred.promise;
};

/**
 * Update selected object in panel context according to selected section
 * @param {object} data - dataProvider having information about selected section
 */
export let updateSelectionInPanelContext = function( data ) {
    let selectedObjects;
    if( data.getClipboardProvider ) {
        selectedObjects = data.getClipboardProvider.selectedObjects;
    } else if( data.getFavoriteProvider ) {
        selectedObjects = data.getFavoriteProvider.selectedObjects;
    } else if( data.getRecentObjsProvider ) {
        selectedObjects = data.getRecentObjsProvider.selectedObjects;
    } else if( data.performSearch ) {
        selectedObjects = data.performSearch.selectedObjects;
    } else if( data.getLinkedObjectProvider ) {
        selectedObjects = adapterSvc.getAdaptedObjectsSync( data.getLinkedObjectProvider.selectedObjects );
    }
    appCtxSvc.updatePartialCtx( 'panelContext.selectedObject', selectedObjects );
};

/**
 * Returns panel context according to gridId
 * @param {String} gridId - ID of grid i.e. cbaSourceTree or cbaTargetTree
 * @returns {Object} panelContext - Panel context object which required to open structure in CBA
 */
export let getOpenPanelConextFromGrid = function( gridId ) {
    let contextKey =  gridId === 'cbaSourceTree'  ? cbaConstants.CBA_TRG_CONTEXT : cbaConstants.CBA_SRC_CONTEXT;
    let urlParamsMap = appCtxSvc.getCtx( contextKey ).urlParams;
    return {
        urlParamsMap: urlParamsMap,
        contextKey: contextKey
    };
};

/**
 * Clean up Linked BOM
 */
export let cleanUpLinkedBOM = function() {
    appCtxSvc.updatePartialCtx( 'cbaContext.linkedBOM', undefined );
};

/**
 * Check whether primaryModelObject has isPartRequired/isDesignRequired property
 * Case 1. if primaryModelObject is Product then return false
 * Case 2. if primaryModelObject is Design/Part then check whether primaryModelObject has isPartRequired/isDesignRequired property
 *
 * @param {*} primaryModelObject - Object from primary work area
 * @returns {boolean} - true if primaryModelObject has isPartRequired/isDesignRequired property
 */
export let isDesignOrPartRequired = function( primaryModelObject ) {
    let result;
    let defer = AwPromiseService.instance.defer();
    let promise = cbaObjectTypeService.isObjectOfGivenType( primaryModelObject, cbaConstants.PRODUCT_EBOM );
    promise.then( function( isProductObject ) {
        if ( isProductObject ) {
            result = false;
            defer.resolve( result );
        } else {
            let modelObject = appCtxSvc.getCtx( 'CBASrcContext.currentState.uid' ) === primaryModelObject.uid ?
                appCtxSvc.getCtx( 'CBASrcContext.modelObject' ) : appCtxSvc.getCtx( 'CBATrgContext.modelObject' );

            if ( modelObject.props && modelObject.props.pma1IsPartRequired ) {
                result = modelObject.props.pma1IsPartRequired.dbValues[0] === '1';
            } else if ( modelObject.props && modelObject.props.pma1IsDesignRequired ) {
                result = modelObject.props.pma1IsDesignRequired.dbValues[0] === '1';
            }
            defer.resolve( result );
        }
    } );

    return defer.promise;
};

/**
 * Populate filter types on cbaContext for openInViewPanel
 * @param {Object} panelContextKey - Panel context key
 */
export let populateFilterTypesForOpenInViewPanel = function( panelContextKey ) {
    //When Platform is TC124, Part/Design types preferences won't be available, so set default filterType
    appCtxSvc.ctx.cbaContext.filterTypes = cbaConstants.ITEM_REVISION;

    if( panelContextKey === cbaConstants.CBA_TRG_CONTEXT ) {
        //Override Part Revision and Product Revision types as filter types if Type preferences exists
        if( appCtxSvc.ctx.preferences.FND0_PARTREVISION_TYPES ) {
            appCtxSvc.ctx.cbaContext.filterTypes = appCtxSvc.ctx.preferences.FND0_PARTREVISION_TYPES.toString();

            if( appCtxSvc.ctx.preferences.FND0_PRODUCTEBOMREVISION_TYPES ) {
                //Append ProductBOM Types if exists
                appCtxSvc.ctx.cbaContext.filterTypes = appCtxSvc.ctx.cbaContext.filterTypes + ',' + appCtxSvc.ctx.preferences.FND0_PRODUCTEBOMREVISION_TYPES.toString();
            }
        }
    } else if( panelContextKey === cbaConstants.CBA_SRC_CONTEXT && appCtxSvc.ctx.preferences.FND0_DESIGNREVISION_TYPES ) {
        //Override Design Revision types as filter types if Design Revision Types preference exists
        appCtxSvc.ctx.cbaContext.filterTypes = appCtxSvc.ctx.preferences.FND0_DESIGNREVISION_TYPES.toString();
    }
};

/**
 * cbaOpenInViewPanelService
 */
export default exports = {
    getProviderAndSectionName,
    initializeServiceForLinkedBom,
    isValidObjectToOpen,
    updateSelectionInPanelContext,
    getOpenPanelConextFromGrid,
    cleanUpLinkedBOM,
    isDesignOrPartRequired,
    populateFilterTypesForOpenInViewPanel
};
app.factory( 'cbaOpenInViewPanelService', () => exports );
