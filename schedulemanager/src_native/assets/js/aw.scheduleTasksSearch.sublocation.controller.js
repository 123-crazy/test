// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * Defines the {@link NgControllers.ScheduleTasksSearchSubLocationCtrl}
 *
 * @module js/aw.scheduleTasksSearch.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.native.sublocation.controller
 * @requires js/aw-sublocation.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'js/aw-sublocation.directive';

'use strict';

/*eslint-disable-next-line valid-jsdoc*/
/**
 * Schedule Tasks Search sublocation controller.
 *
 * @class ScheduleTasksSearchSubLocationCtrl
 * @memberOf NgControllers
 */
app.controller( 'ScheduleTasksSearchSubLocationCtrl', [
    '$scope',
    '$controller',
    '$state',
    '$q',
    function( $scope, $controller, $state, $q ) {

        var self = this; // eslint-disable-line no-invalid-this

        ngModule.extend( self, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Add additional search context.
         *
         * @param {Object} searchContext - The new search context
         * @returns {Object} promise
         */
        $scope.addSearchContext = function( searchContext ) {

            if( $state.params.team ) {
                searchContext.criteria.team = $state.params.team;
            }

            return $q.when( searchContext );
        };

    }
] );
