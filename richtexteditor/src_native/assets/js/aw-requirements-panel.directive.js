// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to display a requirement panel
 * <P>
 * Note: Typical children of aw-requirements-panel are aw-panel-body
 *
 * @module js/aw-requirements-panel.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';

'use strict';

/**
 * Directive to display a command panel
 * <P>
 * Note: Typical children of aw-requirements-panel is aw-panel-body
 *
 * @example <aw-requirements-panel caption="My Panel">...</aw-requirements-panel>
 *
 * @member aw-requirements-panel
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsPanel', //
    [ 'viewModelService', //
        function( viewModelSvc ) {
            return {
                restrict: 'E',
                transclude: true,
                templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-panel.directive.html',
                controller: [ '$scope', function( $scope ) {

                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    viewModelSvc.bindConditionStates( declViewModel, $scope );

                    $scope.conditions = declViewModel.getConditionStates();

                } ],
                link: function( $scope ) {

                    eventBus.publish( "awPanel.reveal", {
                        "scope": $scope
                    } );
                },
                replace: true
            };
        }
    ] );
