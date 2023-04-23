// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-check-list> directive.
 *
 * @module js/aw-check-list.controller
 */
import app from 'app';
import 'js/iconService';
import 'js/viewModelService';

/**
 * Defines awCheckList controller
 *
 * @member awCheckListController
 * @memberof NgControllers
 */
app.controller( 'awCheckListController', [
    '$scope', '$element', 'iconService', 'viewModelService',
    function( $scope, $element, iconSvc, viewModelSvc ) {
        var self = this;
        self._checkAction = $scope.prop.dbValue[ 0 ].checkAction;

        /**
         * Perform the action
         *
         * @param {Object} action - action to be performed
         */
        $scope.doit = function( action ) {
            if( action !== null ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, action, $scope );
            }
        };

        /**
         * update check select widget icon
         */
        self._updateIcon = function() {
            var iconImage = iconSvc.getCmdIcon( $scope.prop.dbValue[ 0 ].iconName );
            if( iconImage ) {
                var imageButton = $element.find( 'button' );
                imageButton.empty();
                imageButton.html( iconImage );
            }
        };

        /**
         * perform checkbox checked\unchecked action
         *
         * @return {Void}
         */
        $scope.checkInputUpdated = function() {
            if( self._checkAction !== null ) {
                self._currentCheckedVal = $scope.prop.dbValue[ 0 ].isChecked;
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, self._checkAction, $scope );
            }
        };

        self._updateIcon();

        $scope.$watch( 'prop.propertyDisplayName', self._updateIcon );

        $scope.$on( '$destroy', function() {
            $scope.prop = null;

            $element.remove();
            $element.empty();
        } );
    }
] );
