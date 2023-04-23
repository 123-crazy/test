//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */
/**
 * @module js/productLaunchInfoProviderService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import csidsToObjectsConverterService from 'js/csidsToObjectsConverterService';
import _ from 'lodash';
import 'js/logger';

/** exported APIs holder */
var exports = {};

/** $q service */

/** appCtxService service */

/** csidsToObjectsConverterService service */

/** viewer context data */
var _viewerCtxData;

/**
 * Sets viewer context data
 * @param  {Object} ctxData viewer context data
 */
export let setViewerContextData = function( ctxData ) {
    _viewerCtxData = ctxData;
};

/**
 * Clears viewerCtxData from service
 */
export let clearViewerCtxData = function() {
    _viewerCtxData = null;
};

/**
 * Determines if visible occs are to launch
 *
 * @param  {Object[]} selectedMOs selected Model Objects
 *
 * @returns {Boolean} true if visible occs are to launch
 */
function _isToLaunchVisibleOccsFromAce( selectedMOs ) {

    var verdict = false;

    // check if something is selected.
    // Selection takes precedence over visibility so this check first becomes mandatory
    var openedElement = appCtxSvc.getCtx( 'occmgmtContext.openedElement' );

    if( selectedMOs && _.size( selectedMOs ) === 1 && selectedMOs[ 0 ].uid !== openedElement.uid ) {

        verdict = false;

    } else {

        if( _.size( _viewerCtxData.getVisibilityManager().getInvisibleCsids() ) > 0 ) {

            verdict = true;
        }
    }

    return verdict;
}

/**
 * Gets Product to launchable map array
 *
 * @returns {Object[]} Array of Map of Product to occs
 */
export let getProductToLaunchableOccMap = function() {
    var deferred = AwPromiseService.instance.defer();
    var selectedMOs = _viewerCtxData.getSelectionManager().getSelectedModelObjects();

    let occmgmtActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';

    var productToOccsMap = [ {
        productContextInfo: appCtxSvc.getCtx( occmgmtContextKey ).productContextInfo,
        selections: selectedMOs
    } ];

    if( _isToLaunchVisibleOccsFromAce( selectedMOs ) ) {

        _viewerCtxData.getVisibilityManager()
            .getVisibleOccsInViewer().then( function( visibleOccs ) {

                if( visibleOccs && _.size( visibleOccs ) > 0 ) {

                    var visibleOccCsids = [];
                    _.forEach( visibleOccs, function( visibleOcc ) {
                        visibleOccCsids.push( visibleOcc.theStr );
                    } );

                    csidsToObjectsConverterService
                        .doPerformSearchForProvidedCSIDChains( visibleOccCsids )
                        .then( function( res ) {
                            var searchResults = [];
                            _.forEach( res.elementsInfo, function( elementInfo ) {
                                searchResults.push( elementInfo.element );
                            } );
                            productToOccsMap[ 0 ].selections = searchResults;
                            deferred.resolve( productToOccsMap );
                        } );
                } else {
                    deferred.resolve( productToOccsMap );
                }
            } );

    } else {
        deferred.resolve( productToOccsMap );
    }

    return deferred.promise;
};

export default exports = {
    setViewerContextData,
    clearViewerCtxData,
    getProductToLaunchableOccMap
};
/**
 * Product Launch Info Provider service
 * @member productLaunchInfoProviderService viewer admin service
 * @memberof NgServices
 *
 * @param {Service} $q $q service
 * @param {Service} appCtxSvc app context service
 * @param {Service} csidsToObjectsConverterService csidsToObjectsConverterService service
 *
 * @returns {Object} exports object
 */
app.factory( 'productLaunchInfoProviderService', () => exports );
