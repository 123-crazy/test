// Copyright (c) 2020 Siemens

/**
 * @module js/aw.html.panel.controller
 */
import app from 'app';
import 'js/selection.service';

/**
 * Defines the htmlPanel controller.
 *
 * @member awHtmlPanelController
 * @memberof NgControllers
 */
app.controller( 'awHtmlPanelController', [
    '$scope', '$element', 'selectionService',
    function( $scope, $element, selectionSvc ) {
        /**
         * <pre>
         * Known potential issues with selection:
         * 1. Lose parent of parent selection in some cases
         * </pre>
         */

        // Define the panel controller
        var self = this;

        $scope.validURL = {};
        $scope.modifiable = true;
        $scope.newValue = {};

        /**
         * @memberof NgControllers.awHtmlPanelController
         *
         * @param {Object} dataObject - Object containing the currently selected {ModelObject} and session
         *            {ModelObject}.
         *
         * @return {Void}
         */
        self.setData = function( dataObject ) {
            $scope.$evalAsync( function() {
                $scope.selected = dataObject.selected;
                $scope.session = dataObject.session;
            } );
        };

        // The parent model object this panel is being used for
        var _parentObject = $scope.$parent.selected;

        // The selection when the panel is initialized
        var _initialSelection = selectionSvc.getSelection();

        // The parent selection to track when updating normal seletion
        var _parentSelection;

        // Have to compare UID as one is a model object and one is a view model object
        if( _initialSelection.parent && _parentObject && _initialSelection.parent.uid === _parentObject.uid ) {
            $scope.modelObjects = _initialSelection.selected;
            _parentSelection = {
                parent: null,
                selected: [ _parentObject ]
            };
        } else {
            _parentSelection = _initialSelection;
        }

        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            /**
             *
             * LCS-116047: Events broadcasted to scopes unintended to act on
             * Incorrect targetScope => Updating selection when shouldn't be updating selection
             *
             */
            if( event.targetScope.$id !== $scope.$id ) {
                return;
            }

            var newSelection = data.selected;

            // If there's a parent object
            if( _parentSelection && _parentSelection.selected[ 0 ] ) {
                // And nothing is selected
                if( !newSelection || newSelection.length === 0 ) {
                    // Set that as the main selection
                    selectionSvc.updateSelection( _parentSelection.selected[ 0 ], _parentSelection.parent );
                } else {
                    // Set that as the parent selection
                    selectionSvc.updateSelection( newSelection, _parentSelection.selected[ 0 ] );
                }
            } else {
                // Otherwise just set normal selection
                selectionSvc.updateSelection( newSelection );
            }
        } );

        /**
         * *** Important Debug Output *** Please keep this block (even if it's commented out)
         *
         * @return {Void}
         */
        $scope.$on( '$destroy', function() {
            $scope.validURL = null;
            $scope.newValue = null;
            $scope.selected = null;
            $scope.session = null;
            $scope.$$watchers = null;

            $element.remove();
        } );
    }
] );
