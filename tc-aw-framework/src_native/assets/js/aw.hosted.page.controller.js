// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * This module contains a controller that handles the hosted page
 *
 * @module js/aw.hosted.page.controller
 */
import * as app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import declUtils from 'js/declUtils';
import 'config/hosting';
import 'js/configurationService';
import 'js/appCtxService';
import 'js/hosting/hostSupportService';

/**
 * {Boolean} TRUE if progress and details of the processing should be logged.
 */
var _debug_logHostComponentActivity = browserUtils.getUrlAttributes().logHostComponentActivity !== undefined;

// eslint-disable-next-line valid-jsdoc
/**
 * @member HostedPageCtrl
 * @memberof NgControllers
 */
app.controller( 'HostedPageCtrl', [
    '$q',
    '$injector',
    '$state',
    '$scope',
    'configurationService',
    'appCtxService',
    'hostSupportService',
    function( $q, $injector, $state, $scope, cfgSvc, appCtxSvc, hostSupportSvc ) {
        /**
         * @param {String} componentId - The ID of the hostedComponent to process.
         * @param {Object} hostingConfigData - The 'hostingConfiguration' data for the hostedComponent to process.
         * @param {ObjectMap} params - The parameters to pass along to the new location.
         */
        function _gotoLocation( componentId, hostingConfigData, params ) {
            /**
             * Handle embedded view on/off
             */
            hostSupportSvc.setEmbeddedLocationView( params.embeddedLocationView );

            /**
             * Config data indicated to navigate to a given location.
             */
            var location = hostingConfigData.componentLocation.replace( /\./g, '_' );

            if( _debug_logHostComponentActivity ) {
                logger.info( 'HostedPageCtrl: ' + '_gotoLocation: ' + '\n' +
                    'componentId=' + componentId + '\n' +
                    'Opening location=' + location + '\n' +
                    'params=' + JSON.stringify( params, null, 2 ) );
            }

            $state.go( location, params, {
                location: 'replace'
            } );
        }

        /**
         * Determine which hostedComponent to try loading (with a fallback of 'objectInfo').
         */
        var componentId = $state.params.componentId;

        if( !componentId && appCtxSvc.ctx.aw_hosting_state && appCtxSvc.ctx.aw_hosting_state.currentHostedComponentId ) {
            componentId = appCtxSvc.ctx.aw_hosting_state.currentHostedComponentId;
        }

        if( !componentId ) {
            componentId = 'com.siemens.splm.clientfx.tcui.xrt.published.ObjectInfo';
        }

        /**
         * Check if this component is defined in any 'hosting.json' files.
         */
        cfgSvc.getCfg( 'hosting.hostedComponents' ).then( function( hostedComponents ) {
            var hostingConfigData = hostedComponents[ componentId ];

            if( !_.isEmpty( hostingConfigData ) ) {
                if( hostingConfigData.componentLocation ) {
                    /**
                     * Even if not actively hosting, a 'hostedComponent' can still be displayed via a URL.
                     */
                    declUtils.loadDependentModule( 'js/hosting/sol/services/hostComponent_2014_07', $q, $injector )
                        .then( function( hostComponentSvc ) {
                            /**
                             * Check if the 'host' has already set a UID in the context map they want to use for
                             * this component.
                             * <P>
                             * If empty: Use any UID set on the $state.params
                             */
                            var objectUids = hostComponentSvc.getComponentContextUids( componentId );

                            if( _.isEmpty( objectUids ) ) {
                                objectUids = $state.params.uid ? [ $state.params.uid ] : null;
                            }

                            hostComponentSvc.setupComponentContext( objectUids, $state.params, null, $scope ).then(
                                function( params ) {
                                    _gotoLocation( componentId, hostingConfigData, params );
                                }
                            );
                        } );
                } else {
                    logger.error( 'HostedPageCtrl: ' + '"componentId": ' + componentId + ' ' + 'No componentLocation specified: ' +
                        JSON.stringify( hostingConfigData ) );
                }
            } else {
                logger.error( 'HostedPageCtrl: ' + '"componentId": ' + componentId + ' ' + 'That "componentId" is not configured.' );
            }
        } );
    }
] );
