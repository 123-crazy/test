// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/createLaunchInfoRequest
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import appCtxSvc from 'js/appCtxService';
import frameAdapterSvc from 'js/frameAdapter.service';
import createLaunchFileRequestSvc from 'js/createLaunchFileRequest';
import messagingSvc from 'js/messagingService';
import declUtils from 'js/declUtils';
import cdm from 'soa/kernel/clientDataModel';

import _ from 'lodash';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

/**
 * {Boolean} TRUE if various processing steps should be logged.
 */
var _debug_logLaunchActivity = browserUtils.getWindowLocationAttributes().logLaunchActivity !== undefined;

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

var exports = {};

/**
 * Launch the Products with list of occurrences
 *
 * @param {Boolean} openInHost - Open in host.
 * @param {Boolean} isTohostInVis - true if AW URL is to be hosted in Vis
 * @param {Object[]} productLaunchInfo - product launch info array
 * @param {Boolean} isReloadOperation - true if the call is made for sending VVI ticket to TcVis
 * @returns {Object} fileTicket to send to TcVis after reload operation
 */
export let launchProduct = function( openInHost, isTohostInVis, productLaunchInfo, isReloadOperation ) {
    var idInfos = [];

    if( productLaunchInfo && productLaunchInfo.length > 0 ) {
        productLaunchInfo.forEach( function( proCtx ) {
            var idInfo = {};

            idInfo.launchedObject = proCtx.productContextInfo;
            idInfo.occurrencesList = proCtx.selections;

            _createIdInfoWithOptionsAndAdditionalInfo( idInfo, openInHost, isTohostInVis );

            if( idInfo.idAdditionalInfo === null || idInfo.idAdditionalInfo === undefined ) {
                idInfo.idAdditionalInfo = {};
            }

            if( proCtx.productContextInfo.props.awb0Product && proCtx.productContextInfo.props.awb0Product.uiValues[ 0 ] ) {
                idInfo.idAdditionalInfo.Title = proCtx.productContextInfo.props.awb0Product.uiValues[ 0 ];
            }

            idInfos.push( idInfo );
        } );
    }

    if( !_.isEmpty( idInfos ) ) {
        if( isReloadOperation ) {
            return _createLaunchInfo( idInfos, openInHost, isReloadOperation );
        }
        return _createLaunchInfo( idInfos, openInHost, isReloadOperation ).catch( function( err ) {
            if( _debug_logLaunchActivity ) {
                logger.info( 'createLaunchInfoRequest: ' + 'launchProduct: ' + 'err=' + err );
            }

            messagingSvc.showWarning( err );
        } );
    }
    logger.error( 'Operation failed since object upon which action is to be performed does not exist.' );
    return AwPromiseService.instance.reject( 'Operation failed since object upon which action is to be performed does not exist.' );
};

/**
 * Launch the selected model objects (can be an occurrence or item)
 *
 * @param {Boolean} openInHost - Open in host.
 * @param {Boolean} isTohostInVis - true if AW URL is to be hosted in Vis
 * @param {Array} selectedObjects - Array of selected objects.
 * @param {Boolean} isReloadOperation - true if the call is made for sending VVI ticket to TcVis
 * @returns {Object} fileTicket to send to TcVis after reload operation
 */
export let launchObject = function( openInHost, isTohostInVis, selectedObjects, isReloadOperation ) {
    var idInfos = [];

    if( selectedObjects && selectedObjects.length > 0 ) {
        selectedObjects.forEach( function( selection ) {
            var idInfo = {};

            idInfo.launchedObject = selection;

            _createIdInfoWithOptionsAndAdditionalInfo( idInfo, openInHost, isTohostInVis, selection );

            idInfos.push( idInfo );
        } );
    }

    if( !_.isEmpty( idInfos ) ) {
        if( isReloadOperation ) {
            return _createLaunchInfo( idInfos, openInHost, isReloadOperation );
        }
        return _createLaunchInfo( idInfos, openInHost, isReloadOperation ).then( function( result ) {
            if( _debug_logLaunchActivity ) {
                logger.info( 'createLaunchInfoRequest: ' + 'launchObject: ' + 'Success of createLaunchInfo: ' + result );
            }
        }, function( err ) {
            if( _debug_logLaunchActivity ) {
                logger.info( 'createLaunchInfoRequest: ' + 'launchObject: ' + 'Failure of createLaunchInfo: ' + err );
            }

            /**
             * Note: This is legacy logic being kept (just-in-case), but if the earlier promise fails it
             * will likely not return 'falsy'.
             */
            if( !err ) {
                createLaunchFileRequestSvc.launchObject( selectedObjects );
            } else {
                messagingSvc.showWarning( err );
            }
        } );
    }
    logger.error( 'Operation failed since object upon which the action is to be performed does not exist.' );
    return AwPromiseService.instance.reject( 'Operation failed since object upon which the action is to be performed does not exist.' );
};

/**
 * Attaches static create options with IdInfo
 *
 * @param {object} idInfo - Idinfo object holding product context info.
 * @param {Boolean} openInHost - Open in host.
 * @param {Boolean} isTohostInVis - true if AW URL is to be hosted in Vis
 */
function _createIdInfoWithOptionsAndAdditionalInfo( idInfo, openInHost, isTohostInVis, selection ) {
    idInfo.createOptions = {
        CreateVisSC: {
            includeInLaunchFile: false,
            optionValue: 'True'
        },
        Operation: {
            includeInLaunchFile: true,
            optionValue: 'Interop'
        }
    };

    if( selection && selection.type !== 'VisStructureContext' ) {
        idInfo.createOptions.TransientDoc = {
            includeInLaunchFile: true,
            optionValue: 'True'
        };
    }

    if( openInHost ) {
        var clientOption = {
            optionValue: 'AW',
            includeInLaunchFile: true
        };

        idInfo.createOptions.CLIENT = clientOption;
    }

    if( isTohostInVis ) {
        var awHostUrl = browserUtils.getBaseURL();

        awHostUrl += '?ah=true';

        /**
         * Pass along common, helpful, host activity logging options.
         */
        var urlAttrs = browserUtils.getWindowLocationAttributes();

        _.forEach( urlAttrs, function( attrValue, attrName ) {
            if( attrName !== 'ah' ) {
                awHostUrl += '&';
                awHostUrl += attrName;

                if( attrValue ) {
                    awHostUrl += '=';
                    awHostUrl += attrValue;
                }
            }
        } );

        awHostUrl += window.location.hash;

        idInfo.idAdditionalInfo = {
            AWSHostedURL: awHostUrl
        };

        let occmgmtActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
        let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
        let occmgmtCtx = appCtxSvc.getCtx( occmgmtContextKey );

        if ( occmgmtCtx && occmgmtCtx.topElement && occmgmtCtx.topElement.uid && occmgmtCtx.topElement.uid.length > 0 ) {
            idInfo.idAdditionalInfo.AWTopElementUID = occmgmtCtx.topElement.uid;
        }

        if( _debug_logLaunchActivity ) {
            logger.info( 'createLaunchInfoRequest: ' + '_createIdInfoWithOptionsAndAdditionalInfo: ' +
                'AWSHostedURL=' + awHostUrl );
        }
    }
}

/**
 * Get server information from session
 *
 * @function _getServerInfoObject
 *
 * @return {Object} Server info object (or NULL if no tcSessionData  on app ctx).
 */
var _getServerInfoObject = function() {
    if( appCtxSvc.ctx.tcSessionData && appCtxSvc.ctx.tcSessionData.server ) {
        var soaPath = appCtxSvc.ctx.tcSessionData.server;
        var protocol = soaPath.substring( 0, soaPath.indexOf( '://', 0 ) );

        return {
            protocol: protocol,
            hostpath: soaPath,
            servermode: 4
        };
    }

    return null;
};

/**
 * Downloads VVI file based on input idInfos.
 *
 * @param {IdInforArray} idInfos - ID Info to use.
 * @param {Boolean} openInHost - TRUE if we should call 'host' API to open.
 * @param {Boolean} isReloadOperation -
 * @returns {Promise} Resolved when processing is complete.
 */
function _createLaunchInfo( idInfos, openInHost, isReloadOperation ) {
    if( _debug_logLaunchActivity ) {
        logger.info( 'createLaunchInfoRequest: ' + 'createLaunchInfo: ' + 'idInfos=' + idInfos.length );
    }

    var serverInfo = _getServerInfoObject();

    return frameAdapterSvc.createLaunchInfo( idInfos, serverInfo, isReloadOperation ).then( function( response ) {
        if( response && response.ticket ) {
            if( _debug_logLaunchActivity ) {
                logger.info( 'createLaunchInfoRequest: ' + 'createLaunchInfo: ' + 'openInHost=' + openInHost );
            }
            if( isReloadOperation ) {
                return AwPromiseService.instance.resolve( response.ticket );
            }
            if( openInHost ) {
                var hostOpenSvc = AwInjectorService.instance.get( 'hostOpenService' );

                if( hostOpenSvc ) {
                    hostOpenSvc.openInHostViaObjectInfo( '', response.ticket, 'VVI' );
                }
            } else {
                var fileName = fmsUtils.getFilenameFromTicket( response.ticket );

                fmsUtils.openFile( response.ticket, fileName );
            }

            return AwPromiseService.instance.resolve( true );
        }

        return AwPromiseService.instance.reject();
    } );
}

export default exports = {
    launchProduct,
    launchObject
};
/**
 * This service contributes to launch to Vis for all Occurrences and Items.
 *
 * @member createLaunchInfoRequest
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {AwInjectorService.instance} AwInjectorService.instance - Service to use.
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {frameAdapterService} frameAdapterSvc - Service to use.
 * @param {createLaunchFileRequest}  createLaunchFileRequestSvc - Service to use.
 * to use.
 * @param {messagingService}  messagingSvc - Service to use.
 *
 * @returns {createLaunchInfoRequest} Reference to the service API object.
 */
app.factory( 'createLaunchInfoRequest', () => exports );
