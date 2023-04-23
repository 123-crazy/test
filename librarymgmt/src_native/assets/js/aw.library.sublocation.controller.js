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
 * 
 * Defines the {@link NgControllers.LibrarySubLocationCtrl}
 * 
 * @module js/aw.library.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.default.location.controller
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'soa/kernel/clientDataModel';
import 'js/appCtxService';

'use strict';

app.controller( 'LibrarySubLocationCtrl', [
    '$scope',
    'appCtxService',
    '$controller',
    '$state',
    'soa_kernel_clientDataModel',
    function( $scope, appCtxService, $controller, $state, clientDataModel ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        var uid = $state.params.filter.substring( $state.params.filter.indexOf( '~' ) - 14, $state.params.filter
            .indexOf( '~' ) );
        var headerName = clientDataModel.getObject( uid );

        var ctx = appCtxService.getCtx( 'location.titles' );
        ctx.headerTitle = headerName.props.object_name.dbValues[ 0 ];
        appCtxService.updateCtx( 'location.titles', ctx );

    }
] );
