// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw.customHtmlPanel.controller
 */
import * as app from 'app';

/**
 * Defines the primary ViewModelProperty based directive controller.
 * 
 * @member awCustomHtmlPanelController
 * @memberof NgControllers
 */
app.controller( 'awCustomHtmlPanelController', //
    [ '$scope', '$element', //
        function( $scope, $element ) {
            var self = this;

            /**
             * @function setData
             * 
             * @param {ViewModelProperty} vmProp - The ViewModelProperty to set as the data basis for the 'directive' using
             *            this controller.
             */
            self.setData = function( data ) {
                $scope.$evalAsync( function() {
                    /**
                     * Set the given data object as the primary property object.
                     */
                    $scope.data = data;
                } ); // evalAsync
            }; // setData

            $scope.$on( '$destroy', function() {
                if( $element.remove ) {
                    $element.remove();
                }
            } ); // $destroy
        }
    ] ); // awPropertyController
