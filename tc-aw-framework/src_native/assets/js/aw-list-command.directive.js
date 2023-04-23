// Copyright (c) 2020 Siemens

/**
 * Directive to show commands inside a cell template of list.
 *
 * @module js/aw-list-command.directive
 */
import app from 'app';
import 'js/conditionService';
import 'js/viewModelService';
import 'js/aw-list-command.controller';
import 'js/aw-pic.directive';

/**
 * Directive to show commands inside a cell template of list.
 *
 * @example <aw-list-command command="command" ></aw-list-command>
 *
 * @member aw-list-command
 * @memberof NgElementDirectives
 */
app.directive( 'awListCommand', [
    'viewModelService', 'conditionService',
    function( viewModelSvc, conditionSvc ) {
        return {
            restrict: 'E',
            scope: {
                command: '=',
                vmo: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-list-command.directive.html',
            controller: 'awListCommandController',
            link: function( $scope, $element, attrs, ctrl ) {
                ctrl.setCommandContext();

                if( $scope.command.action ) {
                    if( $scope.command.condition ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        var evaluationEnv = {
                            data: declViewModel,
                            ctx: $scope.ctx,
                            conditions: declViewModel._internal.conditionStates
                        };

                        $scope.cellCommandVisiblilty = conditionSvc.evaluateCondition( declViewModel, $scope.command.condition, evaluationEnv );
                    } else {
                        $scope.cellCommandVisiblilty = true;
                    }
                }

                /**
                 * Listener for cell rendered event
                 */
                $scope.$on( 'cell.rendered', function() {
                    ctrl.setCommandContext();
                } );
            }
        };
    }
] );
