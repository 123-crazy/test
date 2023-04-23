// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines requirement content controller that will be used by requirement content directives
 *
 * @module js/aw-requirement-content.controller
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';

'use strict';

/**
 * Defines requirement content controller that will be used by requirement content directives
 *
 * @member awRequirementContentController
 * @memberof NgControllers
 */
app.controller( 'awRequirementContentController', [ '$scope', '$timeout', function( $scope, $timeout ) {
    /**
     * Directive scope
     */
    var self = this;

    /**
     * Callback object to be invoked on resize
     */
    self.resizeCallback = null;

    /**
     * Generate unique Id for Ck Editor
     *
     * @return {Void}
     */
    self._generateID = function() {
        // Math.random should be unique because of its seeding algorithm.
        // Convert it to base 36 (numbers + letters), and grab the first 9 characters
        // after the decimal.
        return 'rm-viewer-' + Math.random().toString( 36 ).substr( 2, 9 );
    };

    /**
     * Initializes the element and viewer height
     *
     * @param {Element} _element the directive element
     *
     */
    self.initViewer = function( _element ) {
        self.element = _element;
        if( self.prop ) {
            self.prop.id = self._generateID();
        }
        self.resizeViewer();
    };

    self.setResizeCallback = function( callback ) {
        self.resizeCallback = callback;
    };

    /**
     * Sets the viewer height
     *
     * @return {Void}
     */
    self.setViewerDimensions = function() {
        var height = 0;
        var width = 0;
        if( self.element ) {
            if( appCtxService.ctx.selected && appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) < -1 && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Overview' ) {
                height = 350;
            }
            // this means panel section of UV is in the view
            else if( window.innerHeight > self.element.offset().top ) {
                height = window.innerHeight - self.element.offset().top - 10;
                height = height > 300 ? height : 300;
            } else {
                // this means panel section of UV is drop downed and have to scroll to view it.
                height = window.innerHeight - 120; // 60px from header + 60px from footer
            }

            if( self.panelSection && self.panelSection.width && self.panelSection.width() > 0 ) {
                width = self.panelSection.width() - 40;
            } else {
                width = self.element.parent().width() - 10;
            }

            width = width > 300 ? width : 300;
        }

        self.viewerHeight =  height - 60  + 'px'; //reserving 30 pixels for viewer header labels + + label text when clicked on labels
        self.viewerPanelHeight = height + 'px';
        self.viewerPanelWidth = width + 'px';
        self.viewerWidth =  width - 23  + 'px'; //reserving 23 pixels for scroll bar displayed on hover if applicable
    };

    /**
     * Implements promise for window resize event
     *
     * @return {Void}
     */
    self.resizeTimer = function() {
        self.resizePromise = $timeout( function() {
            if( self ) {
                if( self.setViewerDimensions ) {
                    self.setViewerDimensions();
                }

                if( self.resizeCallback ) {
                    self.resizeCallback( self.viewerPanelWidth, self.viewerPanelHeight );
                }
            }
        }, 100 );
    };

    /**
     * Implements handler for window resize event
     *
     * @return {Void}
     */
    self.resizeViewer = function() {
        if( self.resizePromise ) {
            $timeout.cancel( self.resizePromise );
        }
        self.resizeTimer();
    };

    /**
     * Binds window resize event to resizeViewer handler function
     */
    $scope.$on( 'windowResize', self.resizeViewer );

    var resizeReqViewerListener = eventBus.subscribe( 'requirement.resizeView', function() {
        self.resizeViewer();
    } );

    var resizeReqViewerOnCmdResizeListener = eventBus.subscribe( 'commandBarResized', function() {
        self.resizeViewer();
    } );

    /**
     * Unbinds window resize event handler and element when controller is destroyed
     *
     * @return {Void}
     */
    self.ctrlCleanup = function() {
        eventBus.unsubscribe( resizeReqViewerListener );
        eventBus.unsubscribe( resizeReqViewerOnCmdResizeListener );
        if( self.element ) {
            self.element.remove();
        }

        self.resizeCallback = null;
        self.resizePromise = null;
    };

    /**
     * Cleanup all watchers and instance members when this scope is destroyed.
     *
     * @return {Void}
     */
    $scope.$on( '$destroy', function() {
        //Cleanup
        self.ctrlCleanup();
        self = null;
    } );
} ] );
