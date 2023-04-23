// Copyright (c) 2020 Siemens

/**
 * @module js/aw-command-def.controller
 */
import app from 'app';
import 'js/viewModelService';
import 'js/panelContentService';

// eslint-disable-next-line valid-jsdoc
/**
 * The controller for the aw-command-def directive
 *
 * @class awCommandDefController
 * @memberof NgControllers
 */
app.controller( 'awCommandDefController', [
    '$scope',
    '$q',
    'panelContentService',
    'viewModelService',
    function( $scope, $q, panelContentSvc, viewModelSvc ) {
        var self = this;

        /**
         * Utility to destroy previous xrt view model and update
         *
         * @private
         * @method setCommandDefViewModel
         * @memberOf NgControllers.awCommandDefController
         *
         * @param {Object} newViewModel - New view model
         */
        var setCommandDefViewModel = function( newViewModel ) {
            if( $scope.commandDefViewModel ) {
                $scope.commandDefViewModel.destroy();
            }
            $scope.commandDefViewModel = newViewModel;
        };

        /**
         * Set the new view model on scope and update the view
         *
         * @private
         * @method setViewModel
         * @memberOf NgControllers.awCommandDefController
         *
         * @param {Object} commandDefViewModel - New view model
         */
        var setViewModel = function( commandDefViewModel ) {
            //Update view
            setCommandDefViewModel( commandDefViewModel );
        };

        /**
         * Load command summary for current selection
         *
         * @method loadCommandDefSummary
         * @memberOf NgControllers.awCommandDefController
         *
         * @return {Promise} Promise containing the loaded summary. If selection changes while loading promise will be
         *         rejected.
         */
        self.loadCommandDefSummary = function() {
            //Make a function scoped reference to the model object to detect if it changes while loading XRT
            var selection = $scope.selection;
            if( selection ) {
                return panelContentSvc.getPanelContent( 'commandDefSummary' ).then( function( response ) {
                    var viewContent = response.view;
                    return viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then( function( declViewModel ) {
                        if( $scope.selection === selection ) {
                            //Update view
                            declViewModel.view = viewContent;
                            declViewModel.destroy = function() {
                                declViewModel._internal.destroy( true );
                            };

                            return declViewModel;
                        }
                        return $q.reject( 'Data changed while loading Command Summary' );
                    } );
                } );
            }
            return $q.reject( 'No selection provided' );
        };

        /**
         * Reload Current page
         *
         * @method reloadCurrentPage
         * @memberOf NgControllers.awCommandDefController
         */
        self.reloadCurrentPage = function() {
            //Clear previous view model
            setCommandDefViewModel( null );

            //Load command summary for updated MO (if provided)
            if( $scope.selection ) {
                self.loadCommandDefSummary().then( setViewModel );
            }
        };

        /**
         * Do any cleanup necessary on destroy
         *
         * @method cleanup
         * @memberOf NgControllers.awCommandDefController
         */
        self.cleanup = function() {
            //Clear previous view model
            setCommandDefViewModel( null );
        };
    }
] );
