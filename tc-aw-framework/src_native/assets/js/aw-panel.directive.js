// Copyright (c) 2020 Siemens

/**
 * Directive to display a panel
 * <P>
 * Note: Typical children of aw-panel are aw-panel-body
 *
 * @module js/aw-panel.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';

/**
 * Directive to display a panel
 * <P>
 * Note: Typical children of aw-panel is aw-panel-body
 *
 * @example <aw-panel caption="My Panel">...</aw-panel>
 *
 * @member aw-panel
 * @memberof NgElementDirectives
 */
app.directive( 'awPanel', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-panel.directive.html',
        controller: [ '$scope', function( $scope ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            viewModelSvc.bindConditionStates( declViewModel, $scope );

            $scope.conditions = declViewModel.getConditionStates();
        } ],
        link: function( $scope ) {
            eventBus.publish( 'awPanel.reveal', {
                scope: $scope
            } );
        },
        replace: true
    };
} ] );
