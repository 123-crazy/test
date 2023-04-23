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
 * Defines the {@link NgControllers.OccMgmtSubLocationCtrl}
 *
 * @module js/aw.occmgmt.sublocation.controller
 */
import app from 'app';
import 'js/appCtxService';
import 'js/occmgmtSublocationService';

'use strict';

/**
 * Occurrence Management controller.
 *
 * @class NgControllers.OccMgmtSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'OccMgmtSubLocationCtrl', [
    '$scope',
    'appCtxService',
    'occmgmtSublocationService',
    function OccMgmtSubLocationCtrl( $scope, appCtxSvc, occmgmtSublocationService ) {
        $scope.contextKey = $scope.provider.viewKey ? $scope.provider.viewKey : 'occmgmtContext';

        if( !appCtxSvc.ctx.splitView ) {
            $scope.$on( '$locationChangeSuccess', function() {
                occmgmtSublocationService.updateState( $scope.contextKey );
            } );
        }
    }
] );
