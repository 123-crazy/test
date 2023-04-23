// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * The controller for occmgmt cell
 *
 * @module js/aw-occmgmt-cell.controller
 */
import app from 'app';
import eventBus from 'js/eventBus';
import contextStateMgmtService from 'js/contextStateMgmtService';
import 'js/occmgmtVisibility.service';
import 'soa/kernel/clientDataModel';
import 'js/localeService';
import 'js/appCtxService';

'use strict';

/**
 * The controller for the aw-inbox-cell-content directive
 *
 * @class OccMgmtCellCtrl
 * @memberof NgControllers
 */
app.controller( 'OccMgmtCellCtrl', [
    '$scope',
    '$element',
    'occmgmtVisibilityService',
    'soa_kernel_clientDataModel',
    'localeService',
    'appCtxService',
    function( $scope, $element, occmgmtVisibilitySvc, cdm, localeSvc, appCtxSvc ) {
        localeSvc.getLocalizedText( 'OccurrenceManagementMessages', 'showHideTitle' )
            .then( function( result ) {
                $scope.cellTitle = result;
            } );
        $scope.ctx = appCtxSvc.ctx;
        $scope.viewKey = contextStateMgmtService.getContextKeyFromParentScope( $element.scope() );

        $scope.cellVisibility = occmgmtVisibilitySvc.getOccVisibility( cdm.getObject( $scope.vmo.uid ) );
        //Get it from the vmo
        $scope.isStale = $scope.vmo.isStale;

        var cellListImage = $element.find( '.aw-widgets-cellListCellImage' );
        cellListImage.click( function( event ) {
            $scope.$apply( function() {
                if( appCtxSvc.ctx[ $scope.viewKey ].visibilityControls ) {
                    event.stopPropagation();
                    occmgmtVisibilitySvc.toggleOccVisibility( cdm.getObject( $scope.vmo.uid ) );
                }
            } );
        } );

        /**
         * toggle visibility
         */
        $scope.handleIconTap = function( $event ) {
            $event.preventDefault();
            return false;
        };

        var onOccMgmtVisibilityStateChangeListener = eventBus.subscribe( 'occMgmt.visibilityStateChanged', function() {
            $scope.$applyAsync( function() {
                $scope.cellVisibility = occmgmtVisibilitySvc.getOccVisibility( cdm
                    .getObject( $scope.vmo.uid ) );
            } );
        } );

        //Remove listeners on destroy
        $scope.$on( '$destroy', function() {
            if( onOccMgmtVisibilityStateChangeListener ) {
                eventBus.unsubscribe( onOccMgmtVisibilityStateChangeListener );
            }
        } );
    }
] );
