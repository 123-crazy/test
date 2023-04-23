// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines a service that can accept a chain of Clone Stable Ids (CSIDs) and fetch and return model objects
 * corresponding to those.
 *
 * @module js/csidsToObjectsConverterService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

//eslint-disable-next-line valid-jsdoc

let exports = {}; // eslint-disable-line no-invalid-this

/**
 * Use the 'productContext' of the 'active' context or 't_uid' as the 'productContext' to locate the object.
 *
 * @param {StringArray} csidsToBeSelected - UIDs that form a top-down path to the object to search for.
 *
 * @returns {Object} Response object from SOA 'Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement:getElementsForIds'
 */
export let doPerformSearchForProvidedCSIDChains = function( csidsToBeSelected, shouldFocusOnHiddenPackedElements ) {
    var deferred = AwPromiseService.instance.defer();
    return doPerformSearch( csidsToBeSelected, shouldFocusOnHiddenPackedElements, 'CSID_CHAIN' ).then( function( response ) {
        deferred.resolve( response );
        return deferred.promise;
    } );
};

/**
 * Use the 'productContext' of the 'active' context or 't_uid' as the 'productContext' to locate the object.
 *
 * @param {StringArray} sruidsToBeSelected - BOMLine UIDs of the object to search for.
 *
 * @returns {Object} Response object from SOA 'Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement:getElementsForIds'
 */
 export let doPerformSearchForProvidedSRUIDs = function( sruidsToBeSelected, shouldFocusOnHiddenPackedElements ) {
    var deferred = AwPromiseService.instance.defer();
    return doPerformSearch( sruidsToBeSelected, shouldFocusOnHiddenPackedElements, 'SR_UID' ).then( function( response ) {
        deferred.resolve( response );
        return deferred.promise;
    } );
};

/**
 * Use the 'productContext' of the 'active' context or 't_uid' as the 'productContext' to locate the object.
 *
 * @param {StringArray} uidsToBeSelected - UIDs of the object to search for.
 *
  * @param {StringArray} typeOfUids - typeOfUids -> 'CSID_CHAIN' or 'SR_UID' of the object to search for.*
 *
 * @returns {Object} Response object from SOA 'Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement:getElementsForIds'
 */
 let doPerformSearch = function( uidsToBeSelected, shouldFocusOnHiddenPackedElements,  typeOfUids ) {
    var context = appCtxService.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$

    // identify product context info
    var productContextInfo = context.productContextInfo;

    // identify if alternate configuation is present, then set useAlternateConfig
    var useAlternateConfig = 'false';
    if( context.productContextInfo.props && context.productContextInfo.props.awb0AlternateConfiguration ) {
        var alternatePCIUid = context.productContextInfo.props.awb0AlternateConfiguration.dbValues[ 0 ];
        if( !_.isNull( alternatePCIUid ) && !_.isUndefined( alternatePCIUid ) && !_.isEmpty( alternatePCIUid ) ) {
            useAlternateConfig  = 'true';
        }
    }

    var addVisibleElement = 'false';
    if( !_.isUndefined( shouldFocusOnHiddenPackedElements ) ) {
        addVisibleElement = shouldFocusOnHiddenPackedElements;
    }

    // populate SOA input
    var elementsIn = {
        typeOfElementUids : typeOfUids,
        elementUids : uidsToBeSelected,
        productContext : productContextInfo,
        requestPref : {
            useAlternateConfig : [ useAlternateConfig ],
            addVisibleElement : [ addVisibleElement ]
        }
    };

    return soaService.postUnchecked( 'Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement', 'getElementsForIds', { //$NON-NLS-1$
        elementsIn : elementsIn
    } );
};

export default exports = {
    doPerformSearchForProvidedCSIDChains,
    doPerformSearchForProvidedSRUIDs
};
/**
 * @member csidsToObjectsConverterService
 * @memberof NgServices
 */
app.factory( 'csidsToObjectsConverterService', () => exports );

/**
 * Enable loading of this module in GWT
 */
