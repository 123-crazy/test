// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgElementDirectives.aw-tcoo-viewer}
 *
 * @module js/aw-tcoo-viewer.directive
 * @requires app
 * @requires exist-when.directive
 * @requires aw-viewer-header.directive
 */
import * as app from 'app';
import 'js/aw-tcoo-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/localeService';
import 'js/exist-when.directive';

'use strict';

/**
 * Directive to display the tcoo viewer.
 *
 * @example <aw-tcoo-viewer data="[data]"></aw-tcoo-viewer>
 *
 * @member aw-tcoo-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awTcooViewer', [
    'localeService',
    '$q',
    function( localeSvc, $q ) {
        return {
            restrict: 'E',
            scope: {
                data: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-tcoo-viewer.directive.html',
            link: function( $scope, $element, attrs, controller ) {
                // call this function to set the hostedInOC on $scope
                controller.hostedInOfficeClient();
                // initializing the tcoo viewer
                $q.all( {
                    //Localized text
                    viewerMessages: localeSvc.getTextPromise( 'Awp0CustomViewerMessages' ),
                    //initalize controller
                    controllerInit: controller.initViewer( $element, true )
                } ).then( function( resolved ) {
                    $scope.i18n = {
                        nonSponsoredUserMessage: resolved.viewerMessages.nonSponsoredUserMessage,
                        cancel:resolved.viewerMessages.cancel,
                        continue:resolved.viewerMessages.continue,
                        cancelCheckoutMessageText:resolved.viewerMessages.cancelCheckoutMessageText,
                        tcoowebConnectionFailed:resolved.viewerMessages.tcoowebConnectionFailed,
                        fileOpenSystemError:resolved.viewerMessages.fileOpenSystemError
                    };
                    controller.preparelaunchUrl();
                } );
            },
            controller: 'awTcooViewerController'
        };
    }
] );
