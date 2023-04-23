// Copyright (c) 2020 Siemens

/**
 * @module js/aw-command-def-content.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/appCtxService';

// eslint-disable-next-line valid-jsdoc
/**
 * Controller referenced from the 'div' <aw-xrt>
 *
 * @memberof NgController
 * @member awCommandDefContentController
 */
app.controller( 'awCommandDefContentController', [
    '$scope',
    '$compile',
    'appCtxService',
    function( $scope, $compile, appCtxSvc ) {
        var self = this;

        /**
         * Scope created for embedded view model
         */
        var childScope = null;

        /**
         * Remove an old view model and destroy scope
         *
         * @param {Object} insertionPoint - Element to remove the view model from
         */
        self.detachViewModel = function( insertionPoint ) {
            childScope.$destroy();
            childScope = null;
            insertionPoint.empty();
        };

        /**
         * Handling for when the view model changes
         *
         * @param {Object} insertionPoint - Element to add the view model to
         * @param {Object} newViewModel - View model to add
         */
        self.attachViewModel = function( insertionPoint, newViewModel ) {
            //Bind the view model and create a scope to embed with
            childScope = $scope.$new();

            //Set data to pass to embedded elements
            $scope.data = newViewModel;
            $scope.ctx = appCtxSvc.ctx;

            //And convert to DOM element
            var xrtViewElement = ngModule.element( newViewModel.view );

            //Add the new element into DOM and compile with childScope
            insertionPoint.append( xrtViewElement );
            $compile( xrtViewElement )( childScope );

            _.defer( function() {
                eventBus.publish( newViewModel._internal.panelId + '.contentLoaded' );
            } );
        };
    }
] );
