// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.OrgSubLocationCtrl}
 *
 * @module js/aw.org.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.default.location.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'soa/kernel/clientDataModel';
import 'js/appCtxService';
import 'js/localeService';

'use strict';

/**
 * Organization sublocation controller. Extends the {@link  NgControllers.NativeSubLocationCtrl} to call
 * performAction3 when the XRTSummaryView is displayed for the selected object in the primaryWorkArea.
 *
 * @class NgControllers.OrgSubLocationCtrl
 * @param {Object} $scope  - Directive scope
 * @param {Object} $controller - $controller service
 * @param {Object} $state - $state service
 * @param {Object} $q - $q service
 * @param {Object} cdm - soa_kernel_clientDataModel service
 * @param {Object} appCtxService - appCtx service
 * @param {Object} localeService - locale service
 * @memberOf NgControllers
 */
app.controller( 'OrgSubLocationCtrl', [
    '$scope',
    '$controller',
    '$state',
    '$q',
    'soa_kernel_clientDataModel',
    'appCtxService',
    'localeService',
    function( $scope, $controller, $state, $q, cdm, appCtxService, localeService ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Update 'ActiveWorkspace:xrtContext' in the appCtxService
         *
         * @param {Object} group - group
         * @param {Object} role - role .
         */
        var registerOrUpdateCtx = function( group, role ) {

            var xrtContext = appCtxService.getCtx( "ActiveWorkspace:xrtContext" );
            if( xrtContext ) {
                xrtContext.resourceProviderContentType = "GroupSubobjects";
                xrtContext.groupUID = group;
                xrtContext.roleUID = role ? role : "";
                appCtxService.updateCtx( "ActiveWorkspace:xrtContext", xrtContext );
            } else {
                xrtContext = {
                    "resourceProviderContentType": "GroupSubobjects",
                    "groupUID": group,
                    "roleUID": role ? role : ""
                };
                appCtxService.registerCtx( "ActiveWorkspace:xrtContext", xrtContext );
            }
        };

        /**
         * Do additional processing when updating search context
         *
         * @function addSearchContext
         * @memberOf NgControllers.OrgSubLocationCtrl
         *
         * @param {Object} searchContext - The new search context
         * @param {Object} changedParams - changed params
         *
         * @returns {Object} search Context
         */
        $scope.addSearchContext = function( searchContext, changedParams ) {

            if( !searchContext.criteria || $state.params.d_uids ) {
                searchContext.criteria = {};
            }

            if( $state.params.d_uids ) {
                var d_uids = $state.params.d_uids.split( '^' );
                for( var idx = 0; idx < d_uids.length; idx++ ) {
                    var modelObject = cdm.getObject( d_uids[ idx ] );
                    if( modelObject.type === 'Group' ) {
                        searchContext.criteria.groupUID = d_uids[ idx ];
                    } else if( modelObject.type === 'Role' ) {
                        searchContext.criteria.roleUID = d_uids[ idx ];
                    }
                }
                searchContext.criteria.resourceProviderContentType = "GroupSubobjects";
                if( changedParams.s_uid ) {
                    registerOrUpdateCtx( searchContext.criteria.groupUID, searchContext.criteria.roleUID );
                }
            } else {
                //revert back to Organization
                searchContext.criteria.resourceProviderContentType = "Organization";
            }

            return $q.when( searchContext );
        };
    }
] );
