// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 * define
 */

/**
 * @module js/aw-xrt-summary.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-xrt-summary.controller';
import 'js/editHandlerService';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';
import 'js/aw-xrt-2.directive';

/**
 * XRT summary directive. Display the summary xrt for a view model object.
 */
app.directive( 'awXrtSummary', [
    'editHandlerService',
    function( editHandlerService ) {
        return {
            restrict: 'E',
            scope: {
                modelObject: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-xrt-summary.directive.html',
            controller: 'awXrtSummaryController',
            link: function( $scope, $element, $attrs, $controller ) {
                const onModelObjectChange = function() {
                    //Clear the tabs
                    $scope.xrtPages = [];

                    //Reload XRT for the current page (with the new object)
                    $controller.reloadCurrentPage();
                };

                //When the object changes
                $scope.$watch( 'modelObject', function() {
                    //Call leave confirmation to ensure edits are finished for all non pwa edit handlers
                    const pwaEdithandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
                    const pwaEditHandlerInProgress = pwaEdithandler && pwaEdithandler.editInProgress();
                    if( pwaEditHandlerInProgress ) {
                        onModelObjectChange();
                    } else {
                        editHandlerService.leaveConfirmation().then( function() {
                            onModelObjectChange();
                        } );
                    }
                } );

                //Listen for any related data modified events
                var modelObjectRelatedDataModifiedEventListener = eventBus.subscribe( 'cdm.relatedModified',
                    function( data ) {
                        if( $scope.modelObject ) {
                            var matches = data.relatedModified.filter( function( mo ) {
                                return mo.uid === $scope.modelObject.uid;
                            } );

                            //If location should reload for the current model object
                            if( data.refreshLocationFlag && matches.length ) {
                                //Reload XRT for the current page
                                $scope.$evalAsync( $controller.reloadCurrentPage );
                            }
                        }
                    } );

                $scope.$on( '$destroy', function() {
                    $controller.cleanup();
                    //And remove listener
                    eventBus.unsubscribe( modelObjectRelatedDataModifiedEventListener );
                } );
            }
        };
    }
] );
