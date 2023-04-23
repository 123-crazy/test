// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-link-with-popup-and-icon> directive.
 *
 * @module js/aw-link-with-popup-and-icon.controller
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import logger from 'js/logger';
import 'js/iconService';
import 'js/viewModelService';

/**
 * Defines awLinkWithPopupAndIcon controller
 *
 * @member awLinkWithPopupAndIconController
 * @memberof NgControllers
 */
app.controller( 'awLinkWithPopupAndIconController', [
    '$scope',
    '$element',
    '$timeout',
    'iconService',
    'viewModelService',
    function( $scope, $element, $timeout, iconSvc, viewModelSvc ) {
        var self = this;
        self._uiProperty = $scope.prop;
        self._itemValues = self._uiProperty.dbValue[ 0 ].itemValues;
        self._allCommands = [];

        $scope.expanded = false;

        if( self._itemValues ) {
            for( var i = 0; i < self._itemValues.length; i++ ) {
                var command = {};
                command.id = self._itemValues[ i ].itemId;
                command.iconName = self._itemValues[ i ].iconName;
                command.tooltip = self._itemValues[ i ].tooltip;
                command.action = self._itemValues[ i ].action;
                command.isSelected = self._itemValues[ i ].isSelected;
                if( self._itemValues[ i ].itemId === self._uiProperty.dbValue[ 0 ].defaultId ) {
                    self._defaultId = self._itemValues[ i ].itemId;
                    self._defaultDisplayName = self._itemValues[ i ].tooltip;
                    self._defaultIconName = self._itemValues[ i ].iconName;
                    command.isSelected = true;
                }
                self._allCommands.push( command );
            }
        }

        $scope.commands = self._allCommands;

        /**
         * toggle drop-down
         *
         * @return {Void}
         */
        $scope.toggleDropdown = function() {
            if( $scope.expanded ) {
                $scope.collapseDropdown();
            } else {
                $scope.expandDropdown();
            }
        };

        /**
         * collapse Dropdown
         */
        function setCollapseDropdown() {
            if( $scope.expanded ) {
                $scope.collapseDropdown();
            }
        }

        // Collapse on window resize
        $scope.$on( 'windowResize', function() {
            setCollapseDropdown();
        } );

        /**
         * Expand the drop-down
         *
         * @return {Void}
         */
        $scope.expandDropdown = function() {
            // Setup the click handler
            $( 'body' ).on( 'click touchstart', $scope.exitFieldHandler );
            var imageButton = $element.find( 'button' )[ 0 ];
            var choiceElemDimensions = imageButton.getBoundingClientRect();
            $scope.dropDownVerticalAdj = choiceElemDimensions.height;
            $timeout( function() {
                $scope.expanded = true;
            }, 0 );
        };

        /**
         * Collapse the drop-down
         *
         * @return {Void}
         */
        $scope.collapseDropdown = function() {
            $( 'body' ).off( 'click touchstart', $scope.exitFieldHandler );
            $timeout( function() {
                $scope.expanded = false;
            }, 0 );
        };

        /**
         * Exit field handler which gets triggered when user clicks outside element
         *
         * @return {Void}
         */
        $scope.exitFieldHandler = function() {
            setCollapseDropdown();
        };

        /**
         * Update the widget to reflect the latest selection
         *
         * @param {Object} selectedCommand - selection from the dropdown menu
         *
         * @return {Void}
         */
        $scope.changeSelection = function( selectedCommand ) {
            if( selectedCommand.tooltip === $scope.currentSelectionDisplayName &&
                selectedCommand.iconName === $scope.currentSelectionIconName ) {
                return;
            }
            self._updateUISelectionDisplay( selectedCommand.id, selectedCommand.tooltip, selectedCommand.iconName,
                selectedCommand.action );

            for( var i = 0; i < $scope.commands.length; i++ ) {
                var listCommand = $scope.commands[ i ];
                if( listCommand === selectedCommand ) {
                    $scope.commands[ i ].isSelected = true;
                } else {
                    if( listCommand.isSelected ) {
                        $scope.commands[ i ].isSelected = false;
                    }
                }
            }
        };

        /**
         * Perform the action
         *
         * @param {Object} action - action to be performed
         * @return {Void}
         */
        self._performAction = function( action ) {
            if( action !== null ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, action, $scope );
            }
        };

        /**
         * Update the UI with current selection from dropdown list
         *
         * @param {Number} id - id of the selection
         * @param {String} displayName - display name
         * @param {String} iconName - icon name
         * @param {String} actionToBePerformed - action to be performed
         *
         * @return {Void}
         */
        self._updateUISelectionDisplay = function( id, displayName, iconName, actionToBePerformed ) {
            $scope.currentSelectionId = id;
            $scope.currentSelectionDisplayName = displayName;
            $scope.currentSelectionIconName = iconName;

            var iconImage = iconSvc.getCmdIcon( iconName );
            var iconButton = $element.find( 'button' ).first();
            if( iconImage && iconButton ) {
                iconButton.empty();
                iconButton.html( iconImage );
            }
            if( actionToBePerformed ) {
                self._performAction( actionToBePerformed );
            }
        };

        self._updateUISelectionDisplay( self._defaultId, self._defaultDisplayName, self._defaultIconName, null );

        $scope.$on( '$destroy', function() {
            logger.debug( 'awLinkWithPopupAndIconController: Destroy $scope=', $scope.$id );

            $scope.expanded = null;
            $scope.commands = null;
            $scope.prop = null;
            $scope.currentSelectionId = null;
            $scope.currentSelectionDisplayName = null;
            $scope.currentSelectionIconName = null;

            $element.remove();
            $element.empty();
        } );
    }
] );
