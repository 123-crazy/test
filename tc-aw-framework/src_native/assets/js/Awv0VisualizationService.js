// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0VisualizationService
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import selectionSvc from 'js/selection.service';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import commandsMapSvc from 'js/commandsMapService';
import openInVisualizationProductContextInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import createLaunchInfoRequest from 'js/createLaunchInfoRequest';
import hostConfigValues from 'js/hosting/hostConst_ConfigValues';
import viewerContextSvc from 'js/viewerContext.service';
import tcSessionData from 'js/TcSessionData';
import logger from 'js/logger';
import _ from 'lodash';

/**
 * @return {Promise} Resolved with TRUE if we should be opening in host.
 */
function determineOpenInHost() {
    if( appCtxSvc.ctx.aw_hosting_enabled && appCtxSvc.ctx.aw_host_type === hostConfigValues.HOST_TYPE_VIS ) {
        var deferred = AwPromiseService.instance.defer();

        import( 'js/hosting/hostConst_Services' ).then( function( hostServices ) {
            import( 'js/hosting/hostInteropService' ).then( function() {
                var hostInteropSvc = AwInjectorService.instance.get( 'hostInteropService' );

                var openInHost = hostInteropSvc.getCanTalkWithHost() &&
                    hostInteropSvc.isHostServiceAvailable(
                        hostServices.HS_HOST_OPEN,
                        hostServices.VERSION_2014_02 );

                deferred.resolve( openInHost );
            } );
        } );

        return deferred.promise;
    }

    return AwPromiseService.instance.resolve( false );
}

/**
 * Gets value for prefernce AWV0HostAWInVisUponLaunch
 * @return {Promise} Resolved with true if we should be opening in host.
 */
function determineHostInVis() {
    var deferred = AwPromiseService.instance.defer();
    preferenceSvc.getLogicalValue( 'AWV0HostAWInVisUponLaunch' ).then( function( result ) {
        if( result !== null && result.length > 0 && result.toUpperCase() === 'TRUE' ) {
            deferred.resolve( true );
        } else {
            deferred.resolve( false );
        }
    }, function( error ) {
        logger.error( error );
    } );

    return deferred.promise;
}

/**
 * Gets value for prefernce AWV0LaunchAsTempSession
 * @return {Promise} Resolved with true if we should be opening in host.
 */
function determineTempAppSessionLaunchPref() {
    var deferred = AwPromiseService.instance.defer();
    preferenceSvc.getStringValues( 'AWC_visExposedBetaFeatures' ).then( function( result ) {
        if( result !== null && result.length > 0 ) {
            let index = _.findIndex( result, function( val ) { return val === 'EnableWYSIWYGLaunch'; } );

            if( index >= 0 ) {
                deferred.resolve( true );
            } else {
                deferred.resolve( false );
            }
        } else {
            deferred.resolve( false );
        }
    }, function( error ) {
        logger.error( error );
    } );

    return deferred.promise;
}

/**
 * Fetches VVI for selections.
 *
 */
var launchSelections = function( isReloadOperation ) {
    return AwPromiseService.instance.all( [ determineOpenInHost(), determineHostInVis() ] ).then( function( results ) {
        var selectedObjects = selectionSvc.getSelection().selected;
            return createLaunchInfoRequest.launchObject( results[ 0 ], results[ 1 ], selectedObjects, isReloadOperation );
    } );
};

/**
 * Determines active Viewer Context
 */
var determineViewerActiveNameSpace = function() {
    let allViewerCtx = viewerContextSvc.getRegisteredViewerContextNamseSpaces();
    let occmgmtActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
    return _.find( allViewerCtx, function( vc ) {
        let currentViewerContext = appCtxSvc.getCtx( vc );
        if( currentViewerContext && currentViewerContext.occmgmtContextName &&
            currentViewerContext.occmgmtContextName === occmgmtContextKey ) {
            return true;
        }
    } );
};

/**
 * Fetches VVI for product.
 *
 * @param {Boolean} isTohostInVis - launch VVI in VIS.
 * @param {Array} selectedObjects - Array of selected objects (occurances)
 */
var launchProduct = function( isReloadOperation ) {
    return AwPromiseService.instance.all( [ determineOpenInHost(), determineHostInVis(), determineTempAppSessionLaunchPref() ] )
        .then( function( results ) {
            return openInVisualizationProductContextInfoProvider.getProductLaunchInfo().then( function( productLaunchInfo ) {
                    let TempAppSessionLaunchPrefSet = results[ 2 ];
                    let viewerCtxNamespace = determineViewerActiveNameSpace();
                    let isViewerAvailable = undefined;

                    if( viewerCtxNamespace ) {
                        let viewerCtx = appCtxSvc.ctx[ viewerCtxNamespace ];
                        isViewerAvailable = viewerCtx && viewerCtx.isViewerRevealed && viewerCtx.isViewerRevealed === true;
                    }
                    if( isReloadOperation ) {
                        return createLaunchInfoRequest.launchProduct( results[ 0 ], results[ 1 ], productLaunchInfo, isReloadOperation );
                    }
                        let isTypeSessionOpened = appCtxSvc.ctx.occmgmtContext &&
                            appCtxSvc.ctx.occmgmtContext.openedElement &&
                            appCtxSvc.ctx.occmgmtContext.openedElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) >= 0;

                        if( !isViewerAvailable || !TempAppSessionLaunchPrefSet || isTypeSessionOpened ||
                            tcSessionData.getTCMajorVersion() < 13 || tcSessionData.getTCMajorVersion() === 13 && tcSessionData.getTCMinorVersion() < 1 ) {
                            createLaunchInfoRequest.launchProduct( results[ 0 ], results[ 1 ], productLaunchInfo, isReloadOperation );
                        } else {
                            eventBus.publish( 'viewer.productLaunchEvent', {
                                openInHost: results[ 0 ],
                                isTohostInVis: results[ 1 ],
                                viewerNamespace: viewerCtxNamespace,
                                TempAppSessionLaunchPref: TempAppSessionLaunchPrefSet,
                                productLaunchInfo: productLaunchInfo[ 0 ]
                            } );
                        }
                } )
                .catch( function( failure ) {
                    logger.error( failure );
                    return AwPromiseService.instance.reject( failure );
                } );
        } );
};

/**
 * Checks if current object selection is made from ACE or outside ACE.
 *
 * @returns {Boolean} TRUE if we are currentlu in an ACE sublocation.
 */
var isInACE = function() {
    var subLocationNameToken = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];

    return subLocationNameToken === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation';
};

/**
 * Checks if launchSelections or launchProducts depending upon isACE() result.
 *
 *  @returns {Boolean} TRUE if launchSelections or launchProducts depending upon isACE() result.
 */
var isToLaunchProduct = function() {
    var isToLaunchProduct = false;
    var selectedObjects = selectionSvc.getSelection().selected;

    if( isInACE() ) {
        // fire event to save the autobookmark
        eventBus.publish( 'viewer.saveVisAutoBookmark', {} );
        // Even when in Ace, You can select dataset by XRT
        if( !commandsMapSvc.isInstanceOf( 'Dataset', selectedObjects[ 0 ].modelType ) ) {
            isToLaunchProduct = true;
        }
    }

    return isToLaunchProduct;
};

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

var exports = {};

/**
 * Trigger point for launching 'Open in Vis' feature. Acts upon selected object in context.
 */
export let executeOpenInVisCommand = function() {
    if( isToLaunchProduct() ) {
        launchProduct( false );
    } else {
        launchSelections( false );
    }
};

/**
 *  fetches VVI to send to TcVis after reload
 * @returns {Object} VVI file ticket to send to TcVis after reload operation
 */
export let downloadVVIFileTicketForHostReload = function() {
    if( isToLaunchProduct() ) {
        return launchProduct( true );
    }
    return launchSelections( true );
};

/**
 * Fetches VVI for product Snapshot
 *
 *  @params {Array|Object} data: selected object or command context
 */
export let launchProductSnapshotInVis = function( data ) {
    let arrayContext = _.isArray( data ) ? data : [ data ];
    AwPromiseService.instance.all( [ determineOpenInHost(), determineHostInVis() ] ).then( function( results ) {
        createLaunchInfoRequest.launchObject( results[ 0 ], results[ 1 ], arrayContext );
    } );
};
export default exports = {
    executeOpenInVisCommand,
    launchProductSnapshotInVis,
    launchProduct,
    downloadVVIFileTicketForHostReload
};
/**
 * This service is responsible for 'Open in Vis' feature.
 *
 * @member Awv0VisualizationService
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {AwInjectorService.instance} AwInjectorService.instance - Service to use.
 * @param {selectionService} selectionSvc - Service to use.
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {soa_preferenceService} preferenceSvc - Service to use.
 * @param {commandsMapService} commandsMapSvc - Service to use.
 * @param {openInVisualizationProductContextInfoProvider} openInVisualizationProductContextInfoProvider service to use.
 * @param {createLaunchInfoRequest} createLaunchInfoRequest - Service to use.
 *
 * @return {Awv0VisualizationService} service exports.
 */
app.factory( 'Awv0VisualizationService', () => exports );
