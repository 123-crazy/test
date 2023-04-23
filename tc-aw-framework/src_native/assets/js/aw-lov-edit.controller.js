// Copyright (c) 2020 Siemens

/**
 * @module js/aw-lov-edit.controller
 */
import app from 'app';
import 'js/viewModelService';

/**
 * Using controller for prop update currently, but consider passing an update f(x) from the parent controller using &
 *
 * @memberof NgControllers
 * @member awLovEditController
 *
 * @param {Object} $scope - The AngularJS data context node this controller is being created on.
 * @param {Element} $element - The DOM Element that contains this aw-checkbox-list.
 * @param {Object} $q - The queuing service to use.
 */
app.controller( 'awLovEditController', [
    '$scope',
    '$element',
    '$q',
    'viewModelService',
    function( $scope, $element, $q, viewModelSvc ) {
        /**
         * @memberof NgControllers.awLovEditController
         */
        $scope.$on( '$destroy', function() {
            //
        } );
    }
] );
