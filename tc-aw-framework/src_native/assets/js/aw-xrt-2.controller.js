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
 * @module js/aw-xrt-2.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import assert from 'assert';
import eventBus from 'js/eventBus';

/**
 * Controller referenced from the 'div' <aw-xrt>
 *
 * @memberof NgController
 * @member awXrtController
 */
app.controller( 'awXrtController2', [
    '$scope',
    '$compile',
    function( $scope, $compile ) {
        var self = this;

        /**
         * Scope created for embedded view model
         */
        var childScope = null;

        /**
         * The last selection seen by the aw-xrt-2
         */
        var lastSelection = null;

        /**
         * Decode XML string.
         *
         * @param {String} text - the XML text to decode
         * @return {String} decoded XML String
         */
        var _decodeXML = function( text ) {
            return text ? //
                text.replace( /&amp;/g, "&" ).replace( /&quot;/g, '"' ).replace( /&lt;/g, "<" ).replace( /&gt;/g, ">" ) :
                null;
        };

        /**
         * Remove the XML header from the view string
         *
         * @param {String} xml - xmo string
         * @return {Object} node
         */
        var _getPage = function( xml ) {
            assert( xml !== '' || $.type( xml ) === 'string', 'Invalid xml: ' + xml );
            return $( xml )[ $( xml ).length - 1 ];
        };

        /**
         * Remove an old view model and destroy scope
         *
         * @param {Object} insertionPoint - Element to remove the view model from
         * @param {Object} oldViewModel - View model to remove
         */
        self.detachViewModel = function( insertionPoint, oldViewModel ) {
            childScope.$destroy();
            childScope = null;
            oldViewModel.deactivate();
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
            newViewModel.activate();
            childScope = $scope.$new();

            //Set data to pass to embedded elements
            $scope.data = newViewModel.viewModel;

            //Extract html string
            var htmlString = _getPage( _decodeXML( newViewModel.view ) );

            //And convert to DOM element
            var xrtViewElement = ngModule.element( htmlString );

            //Add the new element into DOM and compile with childScope
            insertionPoint.append( xrtViewElement );
            $compile( xrtViewElement )( childScope );
            eventBus.publish( 'awXRT2.contentLoaded' );
        };

        /**
         * Handling to ensure only one item in an object set is selected at once
         *
         * @param {Object} event - Angular event
         * @param {Object} newSelectedData - New event data
         */
        self.setSelectedData = function( event, newSelectedData ) {
            if( newSelectedData.clearSelections ) {
                return;
            }

            // Nothing has been selected yet
            if( !lastSelection ) {
                // Just set last selection
                lastSelection = {
                    dataProviderName: newSelectedData.dataProviderName,
                    selectionModel: newSelectedData.selectionModel
                };
            } else {
                // Keep track of what is selected in secondary workarea. Only one section ex: Files/Documents can be selected at a time.
                // If we actually have a selection
                if( newSelectedData.selected.length > 0 ) {
                    if( newSelectedData.dataProviderName === lastSelection.dataProviderName ) {
                        // Do nothing - lastSelection does not need to change
                    } else {
                        // Otherwise deselect the objects in the other section
                        lastSelection.selectionModel.selectNone();
                        // And track the new selection
                        lastSelection = {
                            dataProviderName: newSelectedData.dataProviderName,
                            selectionModel: newSelectedData.selectionModel
                        };
                    }
                } else {
                    // if there is an empty selection and it does not come from the last selected data provided capture the event
                    if( newSelectedData.dataProviderName !== lastSelection.dataProviderName ) {
                        event.stopPropagation();
                    }
                }
            }

        };

    }
] );
