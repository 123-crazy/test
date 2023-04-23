// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-float-pdf-popup.directive
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import 'js/aw-i18n.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-label.directive';
import 'js/exist-when.directive';
import 'js/aw-pattern.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-link.directive';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/locationNavigation.service';
import 'js/panelContentService';
import 'js/localeService';
import 'js/adapterService';

//
'use strict';

/*
 * Directive to hold content in a popup.
 *
 * @example <aw-float-pdf-popup>$transclude-content$</aw-float-pdf-popup>
 * @attribute isModal : a consumer can provide an indicator whether it is a modal or modeless, if the attribute is
 *            skipped it would create a modal popup dialog.
 * @member aw-popup class
 * @memberof NgElementDirectives
 */
app.directive( 'awFloatPdfPopup', [

    '$animate', '$timeout', 'viewModelService', 'localeService', //
    function( $animate, $timeout, viewModelSvc, localeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            replace: false,
            scope: false,
            link: function( scope, element, attrs, ctrl, transclude ) {

                scope.modal = ( scope.isModal === undefined || scope.isModal === 'true' );

                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    scope.loadingMsg = localTextBundle.LOADING_TEXT;
                } );

                // Get the container element.
                var container = ngModule.element( element[ 0 ].querySelector( '.aw-popup-contentContainer' ) );

                var mainWindow = ngModule.element( document.querySelector( '#main-view' ) );

                // Set window size to saved value
                if( scope.windowHeight && scope.windowHeight > 0 &&
                    scope.windowWidth && scope.windowHeight > 0 ) {

                    // Don't extend beyond current browser dimensions
                    if( scope.windowHeight > mainWindow.height() ) {
                        scope.windowHeight = mainWindow.height() - 10;
                    }

                    if( scope.windowWidth > mainWindow.width() ) {
                        scope.windowWidth = mainWindow.width() - 10;
                    }

                    container.height( scope.windowHeight );
                    container.width( scope.windowWidth );
                }

                // Animate the opening.
                $animate.addClass( container, 'aw-popup-animate' );

                // Make the container draggable (only if dragging the title bar).
                container.draggable( { handle: ".aw-layout-workareaCommandbar", containment: "parent" } );

                // Make the container resizeable.
                container.resizable();

                // Remove the pesky 'ng-transclude' artifact element that breaks our styling.
                transclude( function( clone ) {
                    element.find( 'ng-transclude' ).after( clone ).remove();
                } );

                // On destroy (close).
                scope.$on( "$destroy", function( one ) {
                    // Nothing needed
                } );

                // Kick off the reveal event in the 'near future'.
                scope.$applyAsync( function() {
                    eventBus.publish( "awFloatPdfPopup.reveal" );
                } );

                var outerWindow = container.parent();

                // Center the popup window
                container.position( {
                    my: "center",
                    at: "center",
                    of: outerWindow
                } );

                // the position command doesn't work for the height so use the offset
                // to move window to the center.
                var offset = container.offset();

                if( scope.windowHeight > 0 ) {
                    offset.top += ( mainWindow.height() - container.height() ) / 2;
                } else {
                    offset.top += 50;
                }

                container.offset( offset );
            },

            templateUrl: app.getBaseUrlPath() + '/html/aw-float-pdf-popup.directive.html'
        };
    }
] );
