// Copyright (c) 2020 Siemens

/**
 * @module js/aw-action-summary.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-action-summary.controller';
import 'js/aw-action-summary-content.directive';
import 'js/appCtxService';
import 'js/editHandlerService';
import saveActionFlowSvc from 'js/saveActionFlowService';

// eslint-disable-next-line valid-jsdoc
/**
 * Command definition summary directive. Display the command summary for a selected object.
 */
app.directive( 'awActionSummary', [ 'appCtxService', 'editHandlerService',
    function( appCtxSvc, editService ) {
        return {
            restrict: 'E',
            scope: {
                selection: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-action-summary.directive.html',
            controller: 'awActionSummaryController',
            link: function( $scope, $element, $attrs, $controller ) {
                var editHandler = saveActionFlowSvc.registerLeaveHandler();
                if( editHandler ) {
                    editService.setEditHandler( editHandler, 'NONE' );
                    editService.setActiveEditHandlerContext( 'NONE' );
                }

                //When the object changes
                $scope.$watch( 'selection', function( newSel, oldSel ) {
                    editHandler.leaveConfirmation().then( function() {
                        //Reload command definition summary for the current page (with the new object)
                        $controller.reloadCurrentPage();
                    } );
                } );

                var configChangeSub = eventBus.subscribe( 'configurationChange.viewmodel', function( eventData ) {
                    if( appCtxSvc.ctx.sublocation.clientScopeURI === 'wysiwygCanvas' ||
                      appCtxSvc.ctx.sublocation.clientScopeURI === 'wysiwygEditor' ||
                      appCtxSvc.ctx.sublocation.clientScopeURI === 'wysiwygPreview' ) {
                        $controller.reloadCurrentPage();
                    }
                } );

                $scope.$on( '$destroy', function() {
                    editService.removeEditHandler( 'NONE' );
                    saveActionFlowSvc.unregisterHandler();
                    $controller.cleanup();
                    if( configChangeSub ) {
                        eventBus.unsubscribe( configChangeSub );
                    }
                } );
            }
        };
    }
] );
